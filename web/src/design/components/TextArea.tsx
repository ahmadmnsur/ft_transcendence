import type { ComponentProps } from 'react';
import { FieldShell, controlClass, useField } from './field';

export interface TextAreaProps extends ComponentProps<'textarea'> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextArea({ label, hint, error, id, rows = 4, 'aria-describedby': describedBy, 'aria-invalid': invalid, className, ...rest }: TextAreaProps): React.JSX.Element {
  const { controlProps, hintId, errorId } = useField('area', { id, hint, error, 'aria-describedby': describedBy, 'aria-invalid': invalid });
  return (
    <FieldShell label={label} controlId={controlProps.id} hint={hint} error={error} hintId={hintId} errorId={errorId} className={className}>
      <textarea rows={rows} dir="auto" {...rest} {...controlProps} className={`${controlClass(Boolean(error))} resize-y`} />
    </FieldShell>
  );
}
