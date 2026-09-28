import { IconBase, type IconProps } from './IconBase';

export function ChevronRightIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}
