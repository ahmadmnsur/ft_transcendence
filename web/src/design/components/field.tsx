import { useId, type ReactNode } from 'react';

interface FieldShellProps {
  label: string;
  fieldId: string;
  hint?: string;
  error?: string;
  hintId: string;
  errorId: string;
  children: ReactNode;
}

export function FieldShell({ label, fieldId, hint, error, hintId, errorId, children }: FieldShellProps): React.JSX.Element {
  return (
    <div className="min-w-0">
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-neutral-800">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="mt-1 text-xs text-neutral-700">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(hint: string | undefined, error: string | undefined, hintId: string, errorId: string): string | undefined {
  if (error) return errorId;
  if (hint) return hintId;
  return undefined;
}

export function mergeDescribedBy(...ids: Array<string | undefined>): string | undefined {
  const merged = ids.filter((id): id is string => Boolean(id)).join(' ');
  return merged === '' ? undefined : merged;
}

export function useFieldIds(prefix: string): { fieldId: string; hintId: string; errorId: string } {
  const raw = useId();
  const id = `${prefix}-${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  return { fieldId: id, hintId: `${id}-hint`, errorId: `${id}-error` };
}

export const controlClass = (invalid: boolean): string =>
  [
    'w-full rounded-lg border bg-white px-3 py-2 text-sm text-neutral-900',
    'placeholder:text-neutral-700',
    'transition-colors duration-150',
    'hover:border-neutral-600',
    'focus-visible:border-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30',
    'disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-600 disabled:hover:border-neutral-200',
    invalid
      ? 'border-danger-600 focus-visible:border-danger-600 focus-visible:ring-danger-600/30'
      : 'border-neutral-500',
  ].join(' ');
