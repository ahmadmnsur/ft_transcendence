import { IconBase, type IconProps } from './IconBase';

export function SortDescIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M12 4.5v15" />
      <path d="m7 14.5 5 5 5-5" />
    </IconBase>
  );
}
