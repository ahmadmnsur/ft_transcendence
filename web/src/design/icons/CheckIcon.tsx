import { IconBase, type IconProps } from './IconBase';

export function CheckIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M20 6 9 17l-5-5" />
    </IconBase>
  );
}
