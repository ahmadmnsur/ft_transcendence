import { IconBase, type IconProps } from './IconBase';

export function SortDescIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </IconBase>
  );
}
