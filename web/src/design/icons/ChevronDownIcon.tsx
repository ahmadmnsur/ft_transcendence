import { IconBase, type IconProps } from './IconBase';

export function ChevronDownIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="m7 9.5 5 5 5-5" />
    </IconBase>
  );
}
