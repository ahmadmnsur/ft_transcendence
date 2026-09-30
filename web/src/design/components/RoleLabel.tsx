import type { ComponentProps } from 'react';

export type RoleLabelProps = Omit<ComponentProps<'span'>, 'children'>;

export function RoleLabel({ className = '', ...rest }: RoleLabelProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-primary-700 px-2 py-0.5 text-xs font-semibold text-white ${className}`.trim()}
      {...rest}
    >
      Admin
    </span>
  );
}
