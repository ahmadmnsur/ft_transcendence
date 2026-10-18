import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type AriaAttributes, type InputEvent, type ReactElement, type ReactNode, type Ref, type RefCallback } from 'react';

// A hint or an error: a plain text, or a message format() filled, so its
// values sit in <bdi> like any other markup.
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

// Ids and aria wiring for one form control. The caller's id wins, their
// aria-invalid holds while there is no error, and their aria-describedby is
// kept after ours.
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
  // Only errors that answer something the user just did are announced. A
  // form's field errors are not, or several would be read out at once: after
  // a refused submit the screen moves focus to the first field in error, which
  // reads its error, or shows a Banner that sums them up.
  announce?: boolean;
  className?: string;
}

// The hint, or the error in its place.
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
  // The alert region stays mounted, so an error that appears in it is read out.
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
  // The label is still read out, but takes no room: for a control whose
  // purpose is clear from its options, as the language switcher's.
  hideLabel?: boolean;
  children: ReactNode;
}

export function FieldShell({ label, controlId, hint, error, hintId, errorId, hideLabel = false, className = '', children }: FieldShellProps): React.JSX.Element {
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <label htmlFor={controlId} className={hideLabel ? 'sr-only' : 'mb-1 block text-sm font-medium text-ink'}>
        {label}
      </label>
      {children}
      <FieldMessages hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </div>
  );
}

export const controlClass = (invalid: boolean): string =>
  [
    // 16 px on phones, where iOS zooms the page into any smaller field it focuses.
    'w-full rounded-lg border bg-surface px-3 py-2 text-base text-ink sm:text-sm',
    'placeholder:text-ink-subtle',
    'transition-colors duration-150 focus-ring',
    'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-muted disabled:text-ink-muted disabled:hover:border-line',
    invalid ? 'border-danger-600 hover:border-danger-700' : 'border-line-strong hover:border-neutral-600',
  ].join(' ');

// dir="auto" takes a field's direction from the first letter of its text, and
// makes an empty field left to right, even on an Arabic page. So a text field
// has dir="auto" only while it holds text: empty, it follows the page, and its
// placeholder and caret start on the page's side. The text is read from the
// element itself: after each render, which brings a controlled value or a new
// defaultValue on a field nobody has typed in; on each input; and after a reset
// of the form it belongs to at that moment, which empties the fields with no
// input event. A script that sets the value itself (`element.value = ''`)
// fires none of these, so the field keeps its direction until the next one. A
// `dir` the caller passes wins, and the caller's ref still gets the element,
// with its own cleanup when it returns one.
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
  // Every render, before the page paints.
  useLayoutEffect(read);
  // The reset event comes before the fields are emptied, so the text is read
  // once it is done. The document hears every form's reset, in the capture
  // phase so that no handler can stop it, and the field's form is the one it
  // belongs to then: a `form` attribute that changes, or a form that mounts
  // after the field, still counts.
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
  // React runs the cleanup this returns when the field detaches, in place of
  // calling it with null. A caller's ref that returns its own cleanup gets it
  // run then; one that returns none is called with null, as React would.
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
