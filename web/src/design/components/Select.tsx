import type { ComponentProps } from 'react';
import { FieldShell, controlClass, useField, type FieldMessage } from './field';

export interface SelectProps extends ComponentProps<'select'> {
  label: string;
  hint?: FieldMessage;
  error?: FieldMessage;
  hideLabel?: boolean;
}

export function Select({ label, hint, error, hideLabel, id, children, 'aria-describedby': describedBy, 'aria-invalid': invalid, className, ...rest }: SelectProps): React.JSX.Element {
  const { controlProps, hintId, errorId } = useField('select', { id, hint, error, 'aria-describedby': describedBy, 'aria-invalid': invalid });
  return (
    <FieldShell label={label} hideLabel={hideLabel} controlId={controlProps.id} hint={hint} error={error} hintId={hintId} errorId={errorId} className={className}>
      <select {...rest} {...controlProps} className={controlClass(Boolean(error))}>
        {children}
      </select>
    </FieldShell>
  );
}
