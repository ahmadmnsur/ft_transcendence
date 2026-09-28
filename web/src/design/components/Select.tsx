import type { SelectHTMLAttributes } from 'react';
import { FieldShell, controlClass, describedBy, mergeDescribedBy, useFieldIds } from './field';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Select({ label, hint, error, id, children, 'aria-describedby': extraDescribedBy, className = '', ...rest }: SelectProps): React.JSX.Element {
  const { fieldId, hintId, errorId } = useFieldIds('select');
  const resolvedId = id ?? fieldId;
  return (
    <FieldShell label={label} fieldId={resolvedId} hint={hint} error={error} hintId={hintId} errorId={errorId}>
      <select
        id={resolvedId}
        {...rest}
        aria-invalid={error ? true : undefined}
        aria-describedby={mergeDescribedBy(describedBy(hint, error, hintId, errorId), extraDescribedBy)}
        className={`${controlClass(Boolean(error))} ${className}`.trim()}
      >
        {children}
      </select>
    </FieldShell>
  );
}
