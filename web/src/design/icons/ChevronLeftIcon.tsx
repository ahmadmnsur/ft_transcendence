import { IconBase, type IconProps } from './IconBase';

export function ChevronLeftIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} flip {...rest}>
      <path d="m14.5 7-5 5 5 5" />
    </IconBase>
  );
}
