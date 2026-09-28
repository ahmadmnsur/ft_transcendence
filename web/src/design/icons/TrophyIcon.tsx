import { IconBase, type IconProps } from './IconBase';

export function TrophyIcon({ size, ...rest }: IconProps): React.JSX.Element {
  return (
    <IconBase size={size} {...rest}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.7V17c0 .6-.5 1-1 1.2-1.1.5-2 2-2 3.8" />
      <path d="M14 14.7V17c0 .6.5 1 1 1.2 1.1.5 2 2 2 3.8" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </IconBase>
  );
}
