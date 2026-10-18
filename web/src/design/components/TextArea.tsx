import type { ComponentProps } from 'react';
import { FieldShell, controlClass, useField, useTextDirection, type FieldMessage } from './field';

export interface TextAreaProps extends ComponentProps<'textarea'> {
  label: string;
  hint?: FieldMessage;
  error?: FieldMessage;
}

export function TextArea({ label, hint, error, id, rows = 4, dir, onInput, ref, 'aria-describedby': describedBy, 'aria-invalid': invalid, className, ...rest }: TextAreaProps): React.JSX.Element {
  const { controlProps, hintId, errorId } = useField('area', { id, hint, error, 'aria-describedby': describedBy, 'aria-invalid': invalid });
  const direction = useTextDirection<HTMLTextAreaElement>({ dir, onInput, ref });
  return (
    <FieldShell label={label} controlId={controlProps.id} hint={hint} error={error} hintId={hintId} errorId={errorId} className={className}>
      <textarea rows={rows} {...rest} {...controlProps} {...direction} className={`${controlClass(Boolean(error))} resize-y`} />
    </FieldShell>
  );
}
