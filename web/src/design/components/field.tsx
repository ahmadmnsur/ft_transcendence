import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type AriaAttributes, type ChangeEventHandler, type CompositionEventHandler, type InputEvent, type ReactElement, type ReactNode, type Ref, type RefCallback } from 'react';
import { charLength, utf8ByteLength } from '@shared/limits';

export type FieldMessage = string | ReactElement;

interface FieldOptions {
  id?: string;
  hint?: FieldMessage;
  error?: FieldMessage;
  'aria-describedby'?: string;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
}

interface Field {
  controlProps: {
    id: string;
    'aria-invalid': AriaAttributes['aria-invalid'];
    'aria-describedby': string | undefined;
  };
  hintId: string;
  errorId: string;
}

export function useField(prefix: string, options: FieldOptions): Field {
  const { id, hint, error, 'aria-describedby': extraDescribedBy, 'aria-invalid': ariaInvalid } = options;
  const base = `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;
  const ownDescribedBy = error ? errorId : hint ? hintId : undefined;
  const describedBy = [ownDescribedBy, extraDescribedBy].filter(Boolean).join(' ');
  return {
    controlProps: {
      id: id ?? base,
      'aria-invalid': error ? true : ariaInvalid,
      'aria-describedby': describedBy === '' ? undefined : describedBy,
    },
    hintId,
    errorId,
  };
}

interface FieldMessagesProps {
  hint?: FieldMessage;
  error?: FieldMessage;
  hintId: string;
  errorId: string;
  announce?: boolean;
  className?: string;
}

export function FieldMessages({ hint, error, hintId, errorId, announce = false, className = '' }: FieldMessagesProps): React.JSX.Element | null {
  const errorLine = error ? (
    <p id={errorId} className={`mt-1 text-xs font-medium text-ink-danger ${className}`.trim()}>
      {error}
    </p>
  ) : null;
  const hintLine =
    !error && hint ? (
      <p id={hintId} className={`mt-1 text-xs text-ink-muted ${className}`.trim()}>
        {hint}
      </p>
    ) : null;
  if (!announce) return errorLine ?? hintLine;
  return (
    <>
      {hintLine}
      <div role="alert">{errorLine}</div>
    </>
  );
}

interface FieldShellProps {
  label: string;
  controlId: string;
  hint?: FieldMessage;
  error?: FieldMessage;
  hintId: string;
  errorId: string;
  className?: string;
  hideLabel?: boolean;
  labelId?: string;
  aside?: ReactNode;
  children: ReactNode;
}

export function FieldShell({ label, controlId, hint, error, hintId, errorId, hideLabel = false, labelId, aside, className = '', children }: FieldShellProps): React.JSX.Element {
  const messages = <FieldMessages hint={hint} error={error} hintId={hintId} errorId={errorId} />;
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <label id={labelId} htmlFor={controlId} className={hideLabel ? 'sr-only' : 'mb-1 block text-sm font-medium text-ink'}>
        {label}
      </label>
      {children}
      {aside ? (
        <div className="flex min-w-0 flex-wrap items-start gap-x-3">
          <div className="min-w-0 flex-[1_1_16rem]">{messages}</div>
          <div className="ms-auto shrink-0">{aside}</div>
        </div>
      ) : (
        messages
      )}
    </div>
  );
}

export type ControlSize = 'sm' | 'md';

const controlSizes: Record<ControlSize, string> = {
  sm: 'relative py-1.5 text-sm pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:-inset-y-1.5',
  md: 'py-2 text-base sm:text-sm',
};

export const controlClass = (invalid: boolean, size: ControlSize = 'md'): string =>
  [
    'w-full rounded-lg border bg-surface px-3 text-ink',
    controlSizes[size],
    'placeholder:text-ink-subtle',
    'transition-colors duration-150 focus-ring',
    'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-muted disabled:text-ink-muted disabled:hover:border-line',
    invalid ? 'border-danger-600 hover:border-danger-700 dark:hover:border-danger-500' : 'border-line-strong hover:border-neutral-600',
  ].join(' ');

export interface TextCap {
  maxChars?: number;
  maxBytes?: number;
  singleLine?: boolean;
}

type Fits = (text: string) => boolean;
type Cut = { value: string; caret: number };

function fitsCap({ maxChars, maxBytes }: TextCap): Fits | undefined {
  if (maxChars === undefined && maxBytes === undefined) return undefined;
  return (text) =>
    (maxChars === undefined || charLength(text) <= maxChars) &&
    (maxBytes === undefined || utf8ByteLength(text.trim()) <= maxBytes);
}

const graphemes = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : undefined;

function boundaries(value: string, from: number, to: number): number[] {
  const inside: number[] = [];
  if (graphemes) {
    for (const { index } of graphemes.segment(value)) if (index > from && index < to) inside.push(index);
  } else {
    let index = 0;
    for (const character of value) {
      if (index > from && index < to) inside.push(index);
      index += character.length;
    }
  }
  return [from, ...inside, to];
}

function keepUpTo(value: string, from: number, to: number, fits: Fits): Cut | undefined {
  const tail = value.slice(to);
  if (!fits(value.slice(0, from) + tail)) return undefined;
  const candidates = boundaries(value, from, to);
  let low = 0;
  let high = candidates.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (fits(value.slice(0, candidates[mid]) + tail)) low = mid;
    else high = mid - 1;
  }
  return { value: value.slice(0, candidates[low]) + tail, caret: candidates[low] };
}

const isHigh = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLow = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

function insertedRange(previous: string, value: string, caret: number | null): [number, number] {
  const caretFits = caret !== null && caret <= value.length && previous.endsWith(value.slice(caret));
  const shortest = Math.min(previous.length, value.length);
  let start = 0;
  let end = 0;
  if (caretFits) {
    end = value.length - caret;
    const headLimit = Math.min(previous.length - end, caret);
    while (start < headLimit && previous.charCodeAt(start) === value.charCodeAt(start)) start += 1;
  } else {
    while (start < shortest && previous.charCodeAt(start) === value.charCodeAt(start)) start += 1;
    while (end < shortest - start && previous.charCodeAt(previous.length - 1 - end) === value.charCodeAt(value.length - 1 - end)) end += 1;
  }
  if (start > 0 && isHigh(value.charCodeAt(start - 1))) start -= 1;
  if (end > 0 && isLow(value.charCodeAt(value.length - end))) end -= 1;
  return [start, value.length - end];
}

function cutToFit(value: string, caret: number | null, previous: string | undefined, fits: Fits): Cut | undefined {
  if (fits(value)) return undefined;
  if (previous !== undefined) {
    const [from, to] = insertedRange(previous, value, caret);
    if (from === to) return undefined;
    return keepUpTo(value, from, to, fits) ?? { value: value.slice(0, from) + value.slice(to), caret: from };
  }
  const end = caret ?? value.length;
  const at = isHigh(value.charCodeAt(end - 1)) && isLow(value.charCodeAt(end)) ? end + 1 : end;
  return keepUpTo(value, 0, fits(value.slice(at)) ? at : value.length, fits);
}

type TextControl = HTMLInputElement | HTMLTextAreaElement;

interface CapHandlers<E extends TextControl> {
  onChange?: ChangeEventHandler<E>;
  onCompositionStart?: CompositionEventHandler<E>;
  onCompositionEnd?: CompositionEventHandler<E>;
}

const beforeComposition = new WeakMap<TextControl, string>();

interface CapOptions {
  previous?: string;
  onCapped?: (cutTo: string | null) => void;
}

function setNativeValue(control: TextControl, value: string): void {
  const prototype = control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(control, value);
}

function flatten(control: TextControl): void {
  const { value } = control;
  if (!/[\r\n]/.test(value)) return;
  const caret = control.selectionEnd ?? value.length;
  const before = value.slice(0, caret).replace(/[\r\n]+/g, ' ');
  control.value = before + value.slice(caret).replace(/[\r\n]+/g, ' ');
  if (control.selectionEnd !== null) control.setSelectionRange(before.length, before.length);
}

export function capText<E extends TextControl>(cap: TextCap, { onChange, onCompositionStart, onCompositionEnd }: CapHandlers<E>, { previous, onCapped }: CapOptions = {}): CapHandlers<E> {
  const fits = fitsCap(cap);
  if (fits === undefined && !cap.singleLine) return { onChange, onCompositionStart, onCompositionEnd };
  return {
    onChange: (event) => {
      const control = event.currentTarget;
      const composing = event.nativeEvent instanceof globalThis.InputEvent && event.nativeEvent.isComposing;
      if (!composing) {
        if (cap.singleLine) flatten(control);
        const next = fits ? cutToFit(control.value, control.selectionEnd, previous, fits) : undefined;
        if (next) {
          control.value = next.value;
          if (control.selectionEnd !== null) control.setSelectionRange(next.caret, next.caret);
        }
        onCapped?.(next ? next.value : null);
      }
      onChange?.(event);
    },
    onCompositionStart: (event) => {
      beforeComposition.set(event.currentTarget, event.currentTarget.value);
      onCompositionStart?.(event);
    },
    onCompositionEnd: (event) => {
      onCompositionEnd?.(event);
      const control = event.currentTarget;
      const snapshot = beforeComposition.get(control);
      beforeComposition.delete(control);
      const flat = cap.singleLine ? control.value.replace(/[\r\n]+/g, ' ') : control.value;
      const caret = control.selectionEnd === null ? null : control.selectionEnd - (control.value.length - flat.length);
      const next = fits ? cutToFit(flat, caret, snapshot, fits) : undefined;
      if (!next && flat === control.value) return;
      setNativeValue(control, next ? next.value : flat);
      if (next && control.selectionEnd !== null) control.setSelectionRange(next.caret, next.caret);
      control.dispatchEvent(new Event('input', { bubbles: true }));
      if (next) onCapped?.(next.value);
    },
  };
}

export function attachRef<E>(ref: Ref<E> | undefined, node: E | null): () => void {
  if (typeof ref === 'function') {
    const cleanup = ref(node);
    return () => {
      if (typeof cleanup === 'function') cleanup();
      else ref(null);
    };
  }
  if (ref) ref.current = node;
  return () => {
    if (ref) ref.current = null;
  };
}

interface TextDirectionOptions<E> {
  dir: string | undefined;
  onInput: ((event: InputEvent<E>) => void) | undefined;
  ref: Ref<E> | undefined;
}

export function useTextDirection<E extends HTMLInputElement | HTMLTextAreaElement>({
  dir,
  onInput,
  ref,
}: TextDirectionOptions<E>): { dir: string | undefined; onInput: (event: InputEvent<E>) => void; ref: RefCallback<E> } {
  const element = useRef<E | null>(null);
  const [hasText, setHasText] = useState(false);
  const read = useCallback(() => {
    if (element.current) setHasText(element.current.value !== '');
  }, []);
  useLayoutEffect(read);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onReset = (event: Event): void => {
      const form = element.current?.form;
      if (form && event.target === form) timer = setTimeout(read, 0);
    };
    document.addEventListener('reset', onReset, true);
    return () => {
      document.removeEventListener('reset', onReset, true);
      clearTimeout(timer);
    };
  }, [read]);
  const setRef = useCallback(
    (node: E | null): (() => void) => {
      element.current = node;
      const detach = attachRef(ref, node);
      return () => {
        element.current = null;
        detach();
      };
    },
    [ref],
  );
  return {
    dir: dir ?? (hasText ? 'auto' : undefined),
    onInput: (event) => {
      setHasText(event.currentTarget.value !== '');
      onInput?.(event);
    },
    ref: setRef,
  };
}
