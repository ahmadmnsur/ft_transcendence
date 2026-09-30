// danger is the confirming step of a destructive action; danger-ghost is the
// quiet way in to one, for a footer or a row where it must not shout.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

// On a touch screen an invisible layer stretches each size to a 44 px target.
const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm pointer-coarse:before:-inset-y-1.5',
  md: 'px-4 py-2 text-sm pointer-coarse:before:-inset-y-1',
  lg: 'px-5 py-2.5 text-base pointer-coarse:before:-inset-y-0.5',
};

const variants: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
  // The border is all that marks a white button on white, so it meets 3:1.
  secondary: 'border-line-strong bg-surface text-ink hover:bg-surface-muted active:bg-surface-sunken',
  ghost: 'border-transparent text-primary-700 hover:bg-primary-50 active:bg-primary-100',
  danger: 'border-transparent bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800',
  'danger-ghost': 'border-transparent text-ink-danger hover:bg-danger-50 active:bg-danger-100',
};

// The look of a Button, for an element that must be something else, such as a link.
export function buttonClasses({ variant = 'primary', size = 'md' }: { variant?: ButtonVariant; size?: ButtonSize } = {}): string {
  return [
    // Every variant has a border, transparent where it does not show, so all are one height.
    'relative inline-flex max-w-full items-center justify-center gap-2 rounded-lg border font-medium',
    'pointer-coarse:before:absolute pointer-coarse:before:inset-x-0',
    'transition-colors duration-150 focus-ring',
    'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
    sizes[size],
    variants[variant],
  ].join(' ');
}
