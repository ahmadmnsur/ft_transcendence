import type { ComponentProps } from 'react';
import { FieldShell, controlClass, useField } from './field';

export interface SelectProps extends ComponentProps<'select'> {
  label: string;
  hint?: string;
  error?: string;
}

export function Select({ label, hint, error, id, children, 'aria-describedby': describedBy, 'aria-invalid': invalid, className, ...rest }: SelectProps): React.JSX.Element {
  const { controlProps, hintId, errorId } = useField('select', { id, hint, error, 'aria-describedby': describedBy, 'aria-invalid': invalid });
  return (
    <FieldShell label={label} controlId={controlProps.id} hint={hint} error={error} hintId={hintId} errorId={errorId} className={className}>
      <select {...rest} {...controlProps} className={controlClass(Boolean(error))}>
        {children}
      </select>
    </FieldShell>
  );
}
