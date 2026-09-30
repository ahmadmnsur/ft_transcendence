import { IconBase, type IconProps } from './IconBase';

export function FileIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M13.5 3h-6A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-10Z" />
      <path d="M13.5 3v5.5H19" />
    </IconBase>
  );
}
