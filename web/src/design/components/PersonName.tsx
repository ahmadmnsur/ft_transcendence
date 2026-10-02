import type { ComponentProps } from 'react';

// <bdi> isolates the name, so a right-to-left or mixed name cannot reorder the
// punctuation and numbers around it. Where markup cannot go (alt, title,
// aria-label, <option>), pass the name as plain text instead.
export interface PersonNameProps extends Omit<ComponentProps<'bdi'>, 'children'> {
  name: string;
}

export function PersonName({ name, ...rest }: PersonNameProps): React.JSX.Element {
  return <bdi {...rest}>{name}</bdi>;
}
