import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md';
  children: ReactNode;
}

export function IconButton({ label, size = 'md', type = 'button', className = '', children, ...rest }: IconButtonProps): React.JSX.Element {
  const dims = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <button
      type={type}
      aria-label={label}
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-lg text-neutral-700',
        'transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-neutral-700',
        dims,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
