import { IconBase, type IconProps } from './IconBase';

export function InfoIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10.5 11H12v6" />
      <circle cx="12" cy="7.75" r="1.1" fill="currentColor" stroke="none" />
    </IconBase>
  );
}
