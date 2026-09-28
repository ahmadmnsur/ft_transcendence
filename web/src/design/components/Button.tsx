import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
  secondary: 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 active:bg-neutral-200',
  ghost: 'text-primary-700 hover:bg-primary-50 active:bg-primary-100',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800',
};

function Spinner(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false" className="animate-spin">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  children,
  className = '',
  ...rest
}: ButtonProps): React.JSX.Element {
  const busy = loading || disabled;
  return (
    <button
      type={type}
      disabled={busy}
      aria-busy={loading || undefined}
      className={[
        'inline-flex max-w-full items-center justify-center gap-2 rounded-lg font-medium',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        sizes[size],
        variants[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}
