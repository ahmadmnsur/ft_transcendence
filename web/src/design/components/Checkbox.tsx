import type { InputHTMLAttributes } from 'react';
import { describedBy, mergeDescribedBy, useFieldIds } from './field';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
  error?: string;
}

export function Checkbox({ label, hint, error, id, 'aria-describedby': extraDescribedBy, 'aria-invalid': ariaInvalid, className = '', ...rest }: CheckboxProps): React.JSX.Element {
  const { fieldId, hintId, errorId } = useFieldIds('checkbox');
  const resolvedId = id ?? fieldId;
  return (
    <div className="min-w-0">
      <div className="flex items-start gap-2">
        <input
          id={resolvedId}
          type="checkbox"
          {...rest}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={mergeDescribedBy(describedBy(hint, error, hintId, errorId), extraDescribedBy)}
          className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${className}`.trim()}
        />
        <label htmlFor={resolvedId} className="text-sm font-medium text-neutral-800">
          {label}
        </label>
      </div>
      {hint && !error ? (
        <p id={hintId} className="mt-1 pl-6 text-xs text-neutral-700">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 pl-6 text-xs font-medium text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
