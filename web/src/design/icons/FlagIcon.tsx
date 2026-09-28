import { IconBase, type IconProps } from './IconBase';

export function FlagIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z" />
      <path d="M4 22v-7" />
    </IconBase>
  );
}
