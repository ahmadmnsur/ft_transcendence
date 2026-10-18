import type { ComponentProps } from 'react';
import { FieldShell, controlClass, useField, useTextDirection, type FieldMessage } from './field';

export interface TextFieldProps extends ComponentProps<'input'> {
  label: string;
  hint?: FieldMessage;
  error?: FieldMessage;
}

export function TextField({ label, hint, error, id, dir, onInput, 'aria-describedby': describedBy, 'aria-invalid': invalid, className, ...rest }: TextFieldProps): React.JSX.Element {
  const { controlProps, hintId, errorId } = useField('field', { id, hint, error, 'aria-describedby': describedBy, 'aria-invalid': invalid });
  const direction = useTextDirection<HTMLInputElement>({ value: rest.value, defaultValue: rest.defaultValue, dir, onInput });
  return (
    <FieldShell label={label} controlId={controlProps.id} hint={hint} error={error} hintId={hintId} errorId={errorId} className={className}>
      <input {...rest} {...controlProps} {...direction} className={controlClass(Boolean(error))} />
    </FieldShell>
  );
}
