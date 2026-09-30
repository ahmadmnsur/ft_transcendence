import { IconBase, type IconProps } from './IconBase';

export function ChevronRightIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="m9.5 7 5 5-5 5" />
    </IconBase>
  );
}
