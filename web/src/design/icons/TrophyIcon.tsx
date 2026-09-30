import { IconBase, type IconProps } from './IconBase';

export function TrophyIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M8 3.5h8v7a4 4 0 0 1-8 0Z" />
      <path d="M8 5.5H5v3a3 3 0 0 0 3 3.5" />
      <path d="M16 5.5h3v3a3 3 0 0 1-3 3.5" />
      <path d="M12 14.5v3" />
      <path d="M10 17.5h4l1.5 3h-7Z" />
    </IconBase>
  );
}
