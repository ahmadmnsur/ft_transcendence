import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type AriaAttributes, type ChangeEventHandler, type InputEvent, type ReactElement, type ReactNode, type Ref, type RefCallback } from 'react';

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

export const controlClass = (invalid: boolean): string =>
  [
    'w-full rounded-lg border bg-surface px-3 py-2 text-base text-ink sm:text-sm',
    'placeholder:text-ink-subtle',
    'transition-colors duration-150 focus-ring',
    'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-muted disabled:text-ink-muted disabled:hover:border-line',
    invalid ? 'border-danger-600 hover:border-danger-700' : 'border-line-strong hover:border-neutral-600',
  ].join(' ');

// maxLength counts UTF-16 code units, and a password's limit is in UTF-8
// bytes, so a field given `maxBytes` keeps that limit itself. Like maxLength,
// an edit that would pass it keeps only the start of what was just typed or
// pasted, the text before the caret, as much as fits, and nothing says so:
// the field never holds more, so the limit needs no message.
const encoder = new TextEncoder();
const byteLength = (text: string): number => encoder.encode(text).length;

// The longest start of `text`, in whole code points, that fits in `room` bytes.
function fitBytes(text: string, room: number): string {
  let kept = '';
  let used = 0;
  for (const char of text) {
    used += byteLength(char);
    if (used > room) break;
    kept += char;
  }
  return kept;
}

export function capBytes(
  maxBytes: number | undefined,
  onChange: ChangeEventHandler<HTMLInputElement> | undefined,
): ChangeEventHandler<HTMLInputElement> | undefined {
  if (maxBytes === undefined) return onChange;
  return (event) => {
    const input = event.currentTarget;
    const { value } = input;
    if (byteLength(value) > maxBytes) {
      const caret = input.selectionEnd ?? value.length;
      const tail = value.slice(caret);
      const room = maxBytes - byteLength(tail);
      // Text after the caret that is too long by itself was not typed at the
      // caret (a script or an autofill set it): the whole value is cut at its end.
      const head = room < 0 ? fitBytes(value, maxBytes) : fitBytes(value.slice(0, caret), room);
      input.value = room < 0 ? head : head + tail;
      if (input.selectionEnd !== null) input.setSelectionRange(head.length, head.length);
    }
    onChange?.(event);
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
