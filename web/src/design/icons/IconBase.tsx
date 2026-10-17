import type { SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  // Set where an icon that points somewhere is drawn, such as a chevron: it is
  // mirrored on a right-to-left page, so it keeps pointing the way the layout
  // runs. Every other icon is drawn the same in both directions.
  flip?: boolean;
}

// Every icon is drawn to one grid: 24 units with a 3 to 21 live area, 1.75
// strokes with round caps and joins, a 2.5 radius on box corners, 5-unit arms
// on chevrons and arrow heads, and filled dots of radius 1.1.
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
