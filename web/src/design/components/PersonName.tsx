import type { ComponentProps } from 'react';
import { isolate } from '../../i18n/text';

// <bdi> isolates the name, so a right-to-left or mixed name cannot reorder the
// punctuation and numbers around it. Where markup cannot go (alt, title,
// aria-label, <option>), use personNameText.
export interface PersonNameProps extends Omit<ComponentProps<'bdi'>, 'children'> {
  name: string;
}

export function PersonName({ name, ...rest }: PersonNameProps): React.JSX.Element {
  return <bdi {...rest}>{name}</bdi>;
}

// The same isolation as plain text.
export function personNameText(name: string): string {
  return isolate(name);
}
