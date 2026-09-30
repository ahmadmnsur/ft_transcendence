import { IconBase, type IconProps } from './IconBase';

export function AlertIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M12 3.5 21.5 20h-19Z" />
      <path d="M12 9.5V14" />
      <circle cx="12" cy="16.75" r="1.1" fill="currentColor" stroke="none" />
    </IconBase>
  );
}
