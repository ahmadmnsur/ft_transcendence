import { IconBase, type IconProps } from './IconBase';

export function CheckIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M5 12.5 9.5 17 19 7.5" />
    </IconBase>
  );
}
