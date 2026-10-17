import { IconBase, type IconProps } from './IconBase';

export function EyeOffIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="m3 3 18 18M9.5 6.3A10 10 0 0 1 12 6c6 0 9 6 9 6a17 17 0 0 1-2.7 3.5M6 6.5A18 18 0 0 0 3 12s3 6 9 6a10 10 0 0 0 4-.8M10.2 10.2a2.5 2.5 0 0 0 3.6 3.6" />
    </IconBase>
  );
}
