import { IconBase, type IconProps } from './IconBase';

export function SortIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="m8 9.5 4-4 4 4" />
      <path d="m8 14.5 4 4 4-4" />
    </IconBase>
  );
}
