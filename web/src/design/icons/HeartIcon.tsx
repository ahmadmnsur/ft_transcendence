import { IconBase, type IconProps } from './IconBase';

export function HeartIcon({ size, filled = false, ...rest }: IconProps & { filled?: boolean }): React.JSX.Element {
  return (
    <IconBase size={size} fill={filled ? 'currentColor' : 'none'} {...rest}>
      <path d="M12 20 4.7 12.9a4.5 4.5 0 0 1 6.3-6.3l1 1 1-1a4.5 4.5 0 0 1 6.3 6.3Z" />
    </IconBase>
  );
}
