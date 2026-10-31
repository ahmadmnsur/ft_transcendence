export type ButtonVariant = 'primary' | 'primary-secondary' | 'secondary' | 'ghost' | 'danger' | 'danger-secondary' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm pointer-coarse:before:-inset-y-1.5',
  md: 'px-4 py-2 text-sm pointer-coarse:before:-inset-y-1',
  lg: 'px-5 py-2.5 text-base pointer-coarse:before:-inset-y-0.5',
};

const variants: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
  'primary-secondary': 'border-primary-600 bg-surface text-primary-700 hover:bg-primary-50 active:bg-primary-100',
  secondary: 'border-line-strong bg-surface text-ink hover:bg-surface-muted active:bg-surface-sunken',
  ghost: 'border-transparent text-primary-700 hover:bg-primary-50 active:bg-primary-100',
  danger: 'border-transparent bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800',
  'danger-secondary': 'border-danger-600 bg-surface text-ink-danger hover:bg-danger-50 active:bg-danger-100',
  'danger-ghost': 'border-transparent text-ink-danger hover:bg-danger-50 active:bg-danger-100',
};

export function buttonClasses({ variant = 'primary', size = 'md' }: { variant?: ButtonVariant; size?: ButtonSize } = {}): string {
  return [
    'relative inline-flex max-w-full items-center justify-center gap-2 rounded-lg border font-medium',
    'pointer-coarse:before:absolute pointer-coarse:before:inset-x-0',
    'transition-colors duration-150 focus-ring',
    'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
    sizes[size],
    variants[variant],
  ].join(' ');
}
