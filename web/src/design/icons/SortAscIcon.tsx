import { IconBase, type IconProps } from './IconBase';

export function SortAscIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </IconBase>
  );
}
