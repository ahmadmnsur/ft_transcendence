import { IconBase, type IconProps } from './IconBase';

export function MenuIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}
