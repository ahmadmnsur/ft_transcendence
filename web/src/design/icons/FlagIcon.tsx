import { IconBase, type IconProps } from './IconBase';

export function FlagIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M5.5 3v18" />
      <path d="M5.5 4h13l-3.25 4.5L18.5 13h-13" />
    </IconBase>
  );
}
