import { useId, type AriaAttributes, type ReactNode } from 'react';

interface FieldOptions {
  id?: string;
  hint?: string;
  error?: string;
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
  hint?: string;
  error?: string;
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
  hint?: string;
  error?: string;
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
