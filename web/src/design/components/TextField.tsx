import type { ComponentProps } from 'react';
import { FieldShell, capBytes, controlClass, useField, useTextDirection, type FieldMessage } from './field';

export interface TextFieldProps extends ComponentProps<'input'> {
  label: string;
  hint?: FieldMessage;
  error?: FieldMessage;
  // The most UTF-8 bytes the field holds, kept without a message (capBytes).
  maxBytes?: number;
}

export function TextField({ label, hint, error, id, dir, onInput, onChange, onCompositionEnd, maxBytes, ref, 'aria-describedby': describedBy, 'aria-invalid': invalid, className, ...rest }: TextFieldProps): React.JSX.Element {
  const { controlProps, hintId, errorId } = useField('field', { id, hint, error, 'aria-describedby': describedBy, 'aria-invalid': invalid });
  const direction = useTextDirection<HTMLInputElement>({ dir, onInput, ref });
  return (
    <FieldShell label={label} controlId={controlProps.id} hint={hint} error={error} hintId={hintId} errorId={errorId} className={className}>
      <input {...rest} {...controlProps} {...direction} {...capBytes(maxBytes, { onChange, onCompositionEnd })} className={controlClass(Boolean(error))} />
    </FieldShell>
  );
}
