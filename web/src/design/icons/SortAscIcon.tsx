import { IconBase, type IconProps } from './IconBase';

export function SortAscIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M12 19.5v-15" />
      <path d="m7 9.5 5-5 5 5" />
    </IconBase>
  );
}
