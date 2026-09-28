import type { TextareaHTMLAttributes } from 'react';
import { FieldShell, controlClass, describedBy, mergeDescribedBy, useFieldIds } from './field';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextArea({ label, hint, error, id, rows = 4, 'aria-describedby': extraDescribedBy, 'aria-invalid': ariaInvalid, className = '', ...rest }: TextAreaProps): React.JSX.Element {
  const { fieldId, hintId, errorId } = useFieldIds('area');
  const resolvedId = id ?? fieldId;
  return (
    <FieldShell label={label} fieldId={resolvedId} hint={hint} error={error} hintId={hintId} errorId={errorId}>
      <textarea
        id={resolvedId}
        rows={rows}
        {...rest}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={mergeDescribedBy(describedBy(hint, error, hintId, errorId), extraDescribedBy)}
        className={`${controlClass(Boolean(error))} ${className}`.trim()}
      />
    </FieldShell>
  );
}
