import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { CheckIcon } from '../icons/CheckIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { CloseIcon } from '../icons/CloseIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { useI18n } from '../../i18n/context';
import { Button } from './Button';
import { FieldShell, controlClass, useField, type ControlSize, type FieldMessage } from './field';

export interface SelectOption {
  value: string;
  label: string;
  lang?: string;
  disabled?: boolean;
  separator?: boolean;
}

interface SelectTrigger {
  className: string;
  children: ReactNode;
}

interface SelectBaseProps {
  label: string;
  hideLabel?: boolean;
  hint?: FieldMessage;
  error?: FieldMessage;
  options: readonly SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  ref?: Ref<HTMLButtonElement>;
  className?: string;
  size?: ControlSize;
  trigger?: SelectTrigger;
}

export type SelectProps = SelectBaseProps & ({ searchable: true; searchPlaceholder: string } | { searchable?: false; searchPlaceholder?: never });

const POPUP_HEIGHT = 320;
const SEARCH_MIN_WIDTH = 256;
const LIST_MIN_WIDTH = 176;
const POPUP_MIN_HEIGHT = 200;
const GAP = 4;
const GUTTER = 16;
const PAGE = 8;
const TYPE_AHEAD_MS = 500;

interface Placement {
  style: CSSProperties;
  above: boolean;
}

function measure(button: HTMLElement, minWidth: number): Placement {
  const rect = button.getBoundingClientRect();
  const visual = window.visualViewport;
  const visibleTop = visual?.offsetTop ?? 0;
  const visibleBottom = visibleTop + (visual?.height ?? window.innerHeight);
  const root = document.documentElement;
  const roomBelow = visibleBottom - rect.bottom - GAP - GUTTER;
  const roomAbove = rect.top - visibleTop - GAP - GUTTER;
  const above = roomBelow < POPUP_MIN_HEIGHT && roomAbove > roomBelow;
  const width = Math.min(Math.max(rect.width, minWidth), root.clientWidth - 2 * GUTTER);
  const rtl = getComputedStyle(button).direction === 'rtl';
  const startEdge = rtl ? root.clientWidth - rect.right : rect.left;
  return {
    above,
    style: {
      ...(above ? { bottom: root.clientHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
      insetInlineStart: Math.max(GUTTER, Math.min(startEdge, root.clientWidth - width - GUTTER)),
      width,
      maxHeight: Math.max(0, Math.min(POPUP_HEIGHT, above ? roomAbove : roomBelow)),
    },
  };
}

function inView(button: HTMLElement): boolean {
  let { top, bottom } = button.getBoundingClientRect();
  for (let box = button.parentElement; box !== null; box = box.parentElement) {
    if (getComputedStyle(box).overflowY === 'visible') continue;
    const rect = box.getBoundingClientRect();
    top = Math.max(top, rect.top);
    bottom = Math.min(bottom, rect.bottom);
  }
  return Math.min(bottom, document.documentElement.clientHeight) > Math.max(top, 0);
}

const fold = (text: string): string => text.normalize('NFKD').replace(/[\p{M}\p{Cf}]/gu, '').toLocaleLowerCase();

function rank(text: string, term: string): number {
  if (text.startsWith(term)) return 0;
  for (let at = text.indexOf(term); at !== -1; at = text.indexOf(term, at + 1)) {
    if (!/[\p{L}\p{N}]/u.test(text[at - 1])) return 1;
  }
  return 2;
}

export function Select({
  label,
  hideLabel,
  hint,
  error,
  options,
  value,
  onValueChange,
  placeholder,
  searchable = false,
  searchPlaceholder,
  loading = false,
  required,
  disabled = false,
  id,
  ref,
  className,
  size,
  trigger,
}: SelectProps): React.JSX.Element {
  const { t, formatText } = useI18n();
  const copy = t.design.select;
  const { controlProps, hintId, errorId } = useField('select', { id, hint, error });
  const base = controlProps.id;
  const labelId = `${base}-label`;
  const listId = `${base}-list`;
  const optionId = (index: number): string => `${base}-option-${index}`;
  const naming = trigger ? { 'aria-label': label } : { 'aria-labelledby': labelId };
  const minWidth = searchable ? SEARCH_MIN_WIDTH : LIST_MIN_WIDTH;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: -Infinity });

  if (disabled && open) setOpen(false);

  const folded = useMemo(() => options.map((option) => fold(option.label)), [options]);
  function matching(searchTerm: string): number[] {
    if (searchTerm === '') return options.map((_, index) => index);
    return options
      .flatMap((_, index) => (folded[index].includes(searchTerm) ? [index] : []))
      .sort((a, b) => rank(folded[a], searchTerm) - rank(folded[b], searchTerm));
  }
  const term = fold(query.trim());
  const matches = matching(term);
  const choosable = matches.filter((index) => !options[index].disabled);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex === -1 ? undefined : options[selectedIndex];
  const activeAt = active === null ? -1 : options.findIndex((option) => option.value === active);
  const activeIndex = activeAt !== -1 && choosable.includes(activeAt) ? activeAt : null;
  const valueAt = (index: number | null): string | null => (index === null ? null : options[index].value);

  function startFor(searchTerm: string, from: 'selected' | 'first' | 'last'): number | null {
    const kept = matching(searchTerm).filter((index) => !options[index].disabled);
    if (from === 'selected') return kept.includes(selectedIndex) ? selectedIndex : null;
    return (from === 'first' ? kept[0] : kept.at(-1)) ?? null;
  }
  const opening = (fallback: 'first' | 'last'): string | null => valueAt(startFor('', 'selected') ?? startFor('', fallback));

  function typing(at: number): boolean {
    return typed.current.text !== '' && at - typed.current.at <= TYPE_AHEAD_MS;
  }

  function typeAhead(key: string, at: number): string | null {
    const text = (typing(at) ? typed.current.text : '') + fold(key);
    typed.current = { text, at };
    const repeated = [...text].every((char) => char === text[0]);
    const needle = repeated ? text[0] : text;
    const order = matching('').filter((index) => !options[index].disabled);
    const from = order.indexOf(activeIndex ?? selectedIndex);
    const start = from === -1 ? 0 : repeated ? from + 1 : from;
    const hit = [...order.slice(start), ...order.slice(0, start)].find((index) => folded[index].startsWith(needle));
    return valueAt(hit ?? null);
  }

  function show(start: string | null, initialQuery: string, keyboard: boolean): void {
    const button = buttonRef.current;
    if (disabled || button === null) return;
    flushSync(() => {
      setQuery(initialQuery);
      setActive(start);
      setByKeyboard(keyboard);
      setPlacement(measure(button, minWidth));
      setOpen(true);
    });
  }

  function hide(returnFocus: boolean): void {
    setOpen(false);
    setQuery('');
    setActive(null);
    if (returnFocus) buttonRef.current?.focus();
  }

  function search(next: string): void {
    const nextTerm = fold(next.trim());
    setQuery(next);
    setActive(valueAt(nextTerm === '' ? startFor('', 'selected') : startFor(nextTerm, 'first')));
  }

  function choose(index: number): void {
    const option = options[index];
    if (option === undefined || option.disabled) return;
    if (option.value !== value) onValueChange(option.value);
    hide(true);
  }

  function leave(event: FocusEvent<HTMLElement>): void {
    const next = event.relatedTarget;
    if (!open || (next instanceof Node && (buttonRef.current?.contains(next) || popupRef.current?.contains(next)))) return;
    hide(false);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const popup = popupRef.current;
    if (popup && typeof popup.showPopover === 'function' && !popup.matches(':popover-open')) popup.showPopover();
    const input = inputRef.current;
    if (input) {
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    } else {
      buttonRef.current?.focus({ preventScroll: true });
    }
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (list && item) list.scrollTop = item.offsetTop - (list.clientHeight - item.offsetHeight) / 2;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const follow = (event: Event): void => {
      if (event.target instanceof Node && popupRef.current?.contains(event.target)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const button = buttonRef.current;
        if (button === null) return;
        if (inView(button)) setPlacement(measure(button, minWidth));
        else hide(false);
      });
    };
    const press = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && (buttonRef.current?.contains(target) || popupRef.current?.contains(target))) return;
      hide(false);
    };
    const visual = window.visualViewport;
    window.addEventListener('resize', follow);
    document.addEventListener('scroll', follow, { capture: true, passive: true });
    document.addEventListener('pointerdown', press, true);
    visual?.addEventListener('resize', follow);
    visual?.addEventListener('scroll', follow);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', follow);
      document.removeEventListener('scroll', follow, { capture: true });
      document.removeEventListener('pointerdown', press, true);
      visual?.removeEventListener('resize', follow);
      visual?.removeEventListener('scroll', follow);
    };
  }, [open, minWidth]);

  const activeId = activeIndex === null ? null : optionId(activeIndex);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!open || list === null || activeId === null) return;
    const reveal = (): void => {
      const item = list.querySelector<HTMLElement>(`#${CSS.escape(activeId)}`);
      if (item === null) return;
      if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop - 4;
      else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
        list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight + 4;
      }
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(list);
    for (const row of list.children) observer.observe(row);
    return () => observer.disconnect();
  }, [open, activeId, term]);

  const resultCount = matches.length;
  const noOptions = options.length === 0;
  useEffect(() => {
    if (open && noOptions) {
      setAnnouncement(loading ? copy.loading : copy.noOptions);
      return;
    }
    if (!open || term === '') {
      setAnnouncement('');
      return;
    }
    const timer = setTimeout(() => setAnnouncement(resultCount === 0 ? copy.noResults : formatText(copy.results, { count: resultCount })), 500);
    return () => clearTimeout(timer);
  }, [open, noOptions, loading, term, resultCount, copy, formatText]);

  function moveBy(step: number): void {
    if (choosable.length === 0) return;
    const at = activeIndex === null ? -1 : choosable.indexOf(activeIndex);
    const next = at === -1 ? (step > 0 ? 0 : choosable.length - 1) : Math.max(0, Math.min(choosable.length - 1, at + step));
    setActive(options[choosable[next]].value);
    setByKeyboard(true);
  }

  function moveTo(start: string | null): void {
    if (start === null) return;
    setActive(start);
    setByKeyboard(true);
  }

  function navigate(event: KeyboardEvent<HTMLElement>): void {
    switch (event.key) {
      case 'ArrowDown':
        moveBy(1);
        break;
      case 'ArrowUp':
        if (event.altKey) hide(true);
        else moveBy(-1);
        break;
      case 'PageDown':
        moveBy(PAGE);
        break;
      case 'PageUp':
        moveBy(-PAGE);
        break;
      case 'Enter':
        if (activeIndex !== null) choose(activeIndex);
        else if (!searchable) hide(true);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.nativeEvent.isComposing || (open && searchable)) return;
    if (event.repeat && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      return;
    }
    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (open) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        hide(true);
      } else if (event.key === ' ' && !typing(event.timeStamp)) {
        event.preventDefault();
        if (activeIndex !== null) choose(activeIndex);
        else hide(true);
      } else if (printable) {
        event.preventDefault();
        moveTo(typeAhead(event.key, event.timeStamp));
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        moveTo(valueAt(startFor('', event.key === 'Home' ? 'first' : 'last')));
      } else {
        navigate(event);
      }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      show(opening(event.key === 'ArrowDown' ? 'first' : 'last'), '', true);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      show(valueAt(startFor('', event.key === 'Home' ? 'first' : 'last')), '', true);
    } else if (event.key === ' ' && !typing(event.timeStamp)) {
      event.preventDefault();
      show(opening('first'), '', true);
    } else if (printable) {
      event.preventDefault();
      if (searchable) show(valueAt(startFor(fold(event.key), 'first')), event.key, true);
      else show(typeAhead(event.key, event.timeStamp) ?? opening('first'), '', true);
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.nativeEvent.isComposing) return;
    if (event.repeat && event.key === 'Enter') {
      event.preventDefault();
    } else if (event.key === 'Tab' && event.shiftKey) {
      event.preventDefault();
      hide(true);
    } else {
      navigate(event);
    }
  }

  const empty = matches.length === 0;

  const button = (
    <button
      ref={(node) => {
        buttonRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      type="button"
      role="combobox"
      {...controlProps}
      {...naming}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-activedescendant={open && !searchable ? (activeId ?? undefined) : undefined}
      aria-required={required || undefined}
      disabled={disabled}
      onMouseDown={(event) => {
        if (open) event.preventDefault();
      }}
      onClick={(event) => {
        if (open) hide(true);
        else show(event.detail === 0 ? opening('first') : valueAt(startFor('', 'selected')), '', event.detail === 0);
      }}
      onKeyDown={onButtonKeyDown}
      onKeyUp={(event) => {
        if (event.key === ' ') event.preventDefault();
      }}
      onBlur={leave}
      className={trigger ? trigger.className : `${controlClass(Boolean(error), size)} flex items-center gap-2 text-start enabled:cursor-pointer`}
    >
      {trigger ? (
        trigger.children
      ) : (
        <>
          <span lang={selected?.lang} title={selected?.label} className={`min-w-0 flex-1 truncate ${selected || disabled ? '' : 'text-ink-subtle'}`}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDownIcon
            size={16}
            className={`shrink-0 text-ink-muted transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          />
        </>
      )}
    </button>
  );

  const popup =
    open && placement ? (
      <div
        ref={popupRef}
        popover="manual"
        style={placement.style}
        onMouseDown={(event) => {
          if (event.target !== inputRef.current) event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || event.nativeEvent.isComposing) return;
          event.preventDefault();
          event.stopPropagation();
          hide(true);
        }}
        onBlur={leave}
        className={[
          'fixed inset-auto z-50 m-0 flex overflow-hidden rounded-xl border border-line bg-surface p-0 text-ink shadow-lg',
          placement.above ? 'flex-col-reverse' : 'flex-col',
          'transition-[opacity,translate] duration-150 ease-out starting:opacity-0 motion-reduce:transition-none',
          placement.above ? 'starting:translate-y-1' : 'starting:-translate-y-1',
        ].join(' ')}
      >
        {searchable ? (
          <div className={`relative shrink-0 border-line p-2 ${placement.above ? 'border-t' : 'border-b'}`}>
            <SearchIcon size={16} className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-ink-subtle" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              {...naming}
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={activeId ?? undefined}
              aria-describedby={controlProps['aria-describedby']}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              dir={query === '' ? undefined : 'auto'}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => {
                search(event.target.value);
                setByKeyboard(true);
              }}
              onKeyDown={onInputKeyDown}
              className={`w-full rounded-md border border-line-strong bg-surface py-2 ps-9 text-base text-ink placeholder:text-ink-subtle focus-ring sm:text-sm ${query === '' ? 'pe-3' : 'pe-10'}`}
            />
            {query === '' ? null : (
              <button
                type="button"
                tabIndex={-1}
                aria-label={copy.clearSearch}
                title={copy.clearSearch}
                onClick={() => {
                  search('');
                  inputRef.current?.focus();
                }}
                className="absolute end-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink pointer-coarse:before:absolute pointer-coarse:before:-inset-1.5"
              >
                <CloseIcon size={16} />
              </button>
            )}
          </div>
        ) : null}
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          {...naming}
          aria-busy={loading || undefined}
          tabIndex={-1}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 empty:hidden"
        >
          {matches.map((index) => {
            const option = options[index];
            const isSelected = index === selectedIndex;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                lang={option.lang}
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onPointerMove={() => {
                  if (option.disabled || (isActive && !byKeyboard)) return;
                  setActive(option.value);
                  setByKeyboard(false);
                }}
                onClick={() => choose(index)}
                className={[
                  'relative flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-base transition-colors duration-150 select-none motion-reduce:transition-none sm:min-h-10 sm:text-sm',
                  option.separator && term === '' ? 'mb-2 after:absolute after:inset-x-3 after:-bottom-1 after:h-px after:bg-line' : '',
                  option.disabled ? 'cursor-not-allowed text-ink-subtle' : isSelected ? 'cursor-pointer font-medium text-primary-700' : 'cursor-pointer text-ink',
                  isSelected ? (isActive ? 'bg-primary-100' : 'bg-primary-50') : isActive ? 'bg-surface-muted' : '',
                  isActive ? 'forced-colors:bg-[Highlight] forced-colors:text-[HighlightText] forced-colors:forced-color-adjust-none' : '',
                  isActive && byKeyboard ? 'outline-2 -outline-offset-2 outline-focus' : '',
                ].join(' ')}
              >
                <span className="min-w-0 flex-1 wrap-anywhere">{option.label}</span>
                {isSelected ? <CheckIcon size={16} className="shrink-0 text-primary-700 forced-colors:text-current" /> : null}
              </li>
            );
          })}
        </ul>
        {empty ? (
          <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
            {loading ? (
              <p className="text-sm text-ink-muted">{copy.loading}</p>
            ) : options.length === 0 ? (
              <p className="text-sm text-ink-muted">{copy.noOptions}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-ink">{copy.noResults}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    search('');
                    inputRef.current?.focus();
                  }}
                >
                  {copy.clearSearch}
                </Button>
              </>
            )}
          </div>
        ) : null}
      </div>
    ) : null;

  const status = (
    <span role="status" className="sr-only">
      {announcement}
    </span>
  );

  if (trigger) {
    return (
      <>
        {button}
        {popup === null ? null : createPortal(popup, document.body)}
        {status}
      </>
    );
  }

  return (
    <FieldShell label={label} hideLabel={hideLabel} labelId={labelId} controlId={base} hint={hint} error={error} hintId={hintId} errorId={errorId} className={className}>
      {button}
      {popup}
      {status}
    </FieldShell>
  );
}
