import { IconBase, type IconProps } from './IconBase';

export function UploadIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M4 15.5v4h16v-4" />
      <path d="M12 14.5V4.5" />
      <path d="M7.5 9 12 4.5 16.5 9" />
    </IconBase>
  );
}
