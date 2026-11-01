import type { SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  flip?: boolean;
}

export function IconBase({ size = 16, flip = false, className, children, ...rest }: IconProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={flip ? `rtl:-scale-x-100 ${className ?? ''}`.trim() : className}
      {...rest}
    >
      {children}
    </svg>
  );
}
