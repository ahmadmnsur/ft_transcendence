import type { ComponentProps } from 'react';
import { FieldShell, controlClass, useField } from './field';

export interface TextFieldProps extends ComponentProps<'input'> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, id, 'aria-describedby': describedBy, 'aria-invalid': invalid, className, ...rest }: TextFieldProps): React.JSX.Element {
  const { controlProps, hintId, errorId } = useField('field', { id, hint, error, 'aria-describedby': describedBy, 'aria-invalid': invalid });
  return (
    <FieldShell label={label} controlId={controlProps.id} hint={hint} error={error} hintId={hintId} errorId={errorId} className={className}>
      <input {...rest} {...controlProps} className={controlClass(Boolean(error))} />
    </FieldShell>
  );
}
