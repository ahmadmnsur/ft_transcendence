import type { ComponentProps, ReactNode } from 'react';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonClasses';

export type { ButtonSize, ButtonVariant } from './buttonClasses';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

function Spinner(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false" className="motion-safe:animate-spin">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  type = 'button',
  onClick,
  children,
  className = '',
  ...rest
}: ButtonProps): React.JSX.Element {
  // A loading or aria-disabled button stays focusable, so a keyboard user who
  // pressed it keeps their place; it only ignores presses, form submits included.
  const inactive = loading || rest['aria-disabled'] === true || rest['aria-disabled'] === 'true';
  return (
    <button
      {...rest}
      type={type}
      aria-disabled={inactive || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (inactive) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={`${buttonClasses({ variant, size })} ${className}`.trim()}
    >
      {loading ? <Spinner /> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}
