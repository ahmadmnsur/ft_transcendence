import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type AriaAttributes, type ChangeEventHandler, type CompositionEventHandler, type InputEvent, type ReactElement, type ReactNode, type Ref, type RefCallback } from 'react';
import { utf8ByteLength } from '@shared/limits';

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
  children: ReactNode;
}

export function FieldShell({ label, controlId, hint, error, hintId, errorId, hideLabel = false, labelId, className = '', children }: FieldShellProps): React.JSX.Element {
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <label id={labelId} htmlFor={controlId} className={hideLabel ? 'sr-only' : 'mb-1 block text-sm font-medium text-ink'}>
        {label}
      </label>
      {children}
      <FieldMessages hint={hint} error={error} hintId={hintId} errorId={errorId} />
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
    invalid ? 'border-danger-600 hover:border-danger-700' : 'border-line-strong hover:border-neutral-600',
  ].join(' ');

const fits = (text: string, maxBytes: number): boolean => utf8ByteLength(text.trim()) <= maxBytes;

function fitting(chars: string[], tail: string, maxBytes: number): number {
  let low = 0;
  let high = chars.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (fits(chars.slice(0, mid).join('') + tail, maxBytes)) low = mid;
    else high = mid - 1;
  }
  return low;
}

function cutToFit(value: string, caret: number, maxBytes: number): { value: string; caret: number } | undefined {
  if (fits(value, maxBytes)) return undefined;
  const before = value.charCodeAt(caret - 1);
  const after = value.charCodeAt(caret);
  const at = before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff ? caret + 1 : caret;
  const cut = fits(value.slice(at), maxBytes) ? at : value.length;
  const chars = [...value.slice(0, cut)];
  const head = chars.slice(0, fitting(chars, value.slice(cut), maxBytes)).join('');
  return { value: head + value.slice(cut), caret: head.length };
}

interface CapHandlers {
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onCompositionEnd?: CompositionEventHandler<HTMLInputElement>;
}

export function capBytes(maxBytes: number | undefined, { onChange, onCompositionEnd }: CapHandlers): CapHandlers {
  if (maxBytes === undefined) return { onChange, onCompositionEnd };
  return {
    onChange: (event) => {
      const input = event.currentTarget;
      const composing = event.nativeEvent instanceof globalThis.InputEvent && event.nativeEvent.isComposing;
      const next = composing ? undefined : cutToFit(input.value, input.selectionEnd ?? input.value.length, maxBytes);
      if (next) {
        input.value = next.value;
        if (input.selectionEnd !== null) input.setSelectionRange(next.caret, next.caret);
      }
      onChange?.(event);
    },
    onCompositionEnd: (event) => {
      onCompositionEnd?.(event);
      const input = event.currentTarget;
      const next = cutToFit(input.value, input.selectionEnd ?? input.value.length, maxBytes);
      if (!next) return;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, next.value);
      if (input.selectionEnd !== null) input.setSelectionRange(next.caret, next.caret);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
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
      if (typeof ref === 'function') {
        const callback = ref;
        const cleanup = callback(node);
        return () => {
          element.current = null;
          if (typeof cleanup === 'function') cleanup();
          else callback(null);
        };
      }
      const object = ref;
      if (object) object.current = node;
      return () => {
        element.current = null;
        if (object) object.current = null;
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
