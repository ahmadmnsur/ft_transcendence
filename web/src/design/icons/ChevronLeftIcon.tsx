import { IconBase, type IconProps } from './IconBase';

export function ChevronLeftIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="m15 18-6-6 6-6" />
    </IconBase>
  );
}
