import type { ComponentProps, ReactNode } from 'react';

// No aria-disabled: an unavailable icon button uses disabled.
export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'aria-label' | 'aria-disabled'> {
  // The button's name, also shown as a tooltip.
  label: string;
  size?: 'xs' | 'sm' | 'md';
  // 'inherit' keeps the surrounding text colour, for a button on a tinted
  // background such as a banner or a chip.
  tone?: 'neutral' | 'inherit';
  children: ReactNode;
}

// On a touch screen the two small sizes reach past their edges with an
// invisible layer, so a finger lands a target of about 40 to 44 px.
const dims: Record<NonNullable<IconButtonProps['size']>, string> = {
  xs: 'h-6 w-6 pointer-coarse:before:absolute pointer-coarse:before:-inset-2',
  sm: 'h-8 w-8 pointer-coarse:before:absolute pointer-coarse:before:-inset-1.5',
  md: 'h-10 w-10',
};

const tones: Record<NonNullable<IconButtonProps['tone']>, string> = {
  neutral:
    'text-ink-muted hover:bg-surface-muted hover:text-ink active:bg-surface-sunken disabled:hover:bg-transparent disabled:hover:text-ink-muted',
  inherit: 'hover:bg-current/10 active:bg-current/15 disabled:hover:bg-transparent',
};

export function IconButton({ label, size = 'md', tone = 'neutral', type = 'button', className = '', children, ...rest }: IconButtonProps): React.JSX.Element {
  return (
    <button
      title={label}
      {...rest}
      type={type}
      aria-label={label}
      className={[
        'relative inline-flex shrink-0 items-center justify-center rounded-lg',
        'transition-colors duration-150 focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        dims[size],
        tones[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}
