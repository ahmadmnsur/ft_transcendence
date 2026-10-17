import type { ComponentProps } from 'react';
import { FieldMessages, useField, type FieldMessage } from './field';

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: string;
  hint?: FieldMessage;
  error?: FieldMessage;
}

export function Checkbox({ label, hint, error, id, 'aria-describedby': describedBy, 'aria-invalid': invalid, className = '', ...rest }: CheckboxProps): React.JSX.Element {
  const { controlProps, hintId, errorId } = useField('checkbox', { id, hint, error, 'aria-describedby': describedBy, 'aria-invalid': invalid });
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          {...rest}
          {...controlProps}
          className="peer mt-0.5 h-4 w-4 shrink-0 cursor-pointer focus-ring disabled:cursor-not-allowed"
        />
        <label htmlFor={controlProps.id} className="min-w-0 cursor-pointer text-sm font-medium text-ink peer-disabled:cursor-not-allowed peer-disabled:text-ink-muted">
          {label}
        </label>
      </div>
      <FieldMessages hint={hint} error={error} hintId={hintId} errorId={errorId} className="ps-6" />
    </div>
  );
}
