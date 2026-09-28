import type { InputHTMLAttributes } from 'react';
import { FieldShell, controlClass, describedBy, mergeDescribedBy, useFieldIds } from './field';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, id, 'aria-describedby': extraDescribedBy, className = '', ...rest }: TextFieldProps): React.JSX.Element {
  const { fieldId, hintId, errorId } = useFieldIds('field');
  const resolvedId = id ?? fieldId;
  return (
    <FieldShell label={label} fieldId={resolvedId} hint={hint} error={error} hintId={hintId} errorId={errorId}>
      <input
        id={resolvedId}
        {...rest}
        aria-invalid={error ? true : undefined}
        aria-describedby={mergeDescribedBy(describedBy(hint, error, hintId, errorId), extraDescribedBy)}
        className={`${controlClass(Boolean(error))} ${className}`.trim()}
      />
    </FieldShell>
  );
}
