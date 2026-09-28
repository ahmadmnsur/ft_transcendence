import { IconBase, type IconProps } from './IconBase';

export function ChevronDownIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}
