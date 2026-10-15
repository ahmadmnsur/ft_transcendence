import { useState } from 'react';
import { EyeIcon } from '../icons/EyeIcon';
import { EyeOffIcon } from '../icons/EyeOffIcon';
import { FieldShell, controlClass, useField } from './field';
import { IconButton } from './IconButton';
import type { TextFieldProps } from './TextField';

export interface PasswordFieldProps extends Omit<TextFieldProps, 'type'> {
  showPasswordLabel: string;
  hidePasswordLabel: string;
}

export function PasswordField({ label, hint, error, id, showPasswordLabel, hidePasswordLabel, 'aria-describedby': describedBy, 'aria-invalid': invalid, className, disabled, ...rest }: PasswordFieldProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const { controlProps, hintId, errorId } = useField('password', { id, hint, error, 'aria-describedby': describedBy, 'aria-invalid': invalid });
  return (
    <FieldShell label={label} controlId={controlProps.id} hint={hint} error={error} hintId={hintId} errorId={errorId} className={className}>
      <div className="relative">
        <input
          dir="auto"
          autoCapitalize="none"
          spellCheck={false}
          {...rest}
          {...controlProps}
          disabled={disabled}
          type={visible ? 'text' : 'password'}
          className={`${controlClass(Boolean(error))} min-h-11 pe-12`}
        />
        {/* IconButton is itself `relative`, so it cannot also be `absolute`: the wrapper does the positioning. */}
        <span className="absolute inset-y-0 end-0.5 flex items-center">
          <IconButton
            label={visible ? hidePasswordLabel : showPasswordLabel}
            aria-controls={controlProps.id}
            disabled={disabled}
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
          </IconButton>
        </span>
      </div>
    </FieldShell>
  );
}
