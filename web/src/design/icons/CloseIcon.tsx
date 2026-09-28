import { IconBase } from './IconBase';
import type { IconProps } from './IconBase';

export function CloseIcon(props: IconProps): React.JSX.Element {
  return (
    <IconBase {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </IconBase>
  );
}
