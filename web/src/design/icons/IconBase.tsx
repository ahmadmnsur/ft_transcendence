import type { SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

// Every icon is drawn to one grid: 24 units with a 3 to 21 live area, 1.75
// strokes with round caps and joins, a 2.5 radius on box corners, 5-unit arms
// on chevrons and arrow heads, and filled dots of radius 1.1.
export function IconBase({ size = 16, children, ...rest }: IconProps): React.JSX.Element {
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
      {...rest}
    >
      {children}
    </svg>
  );
}
