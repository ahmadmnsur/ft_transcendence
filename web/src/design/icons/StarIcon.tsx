import { IconBase, type IconProps } from './IconBase';

export function StarIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M12 3.3 14.6 9.3 21.1 9.9 16.2 14.3 17.6 20.7 12 17.4 6.4 20.7 7.8 14.3 2.9 9.9 9.4 9.3Z" />
    </IconBase>
  );
}
