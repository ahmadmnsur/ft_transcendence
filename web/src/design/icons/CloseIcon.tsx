import { IconBase, type IconProps } from './IconBase';

export function CloseIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="m7 7 10 10M17 7 7 17" />
    </IconBase>
  );
}
