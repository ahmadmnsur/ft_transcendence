import type { ComponentProps } from 'react';
import { useI18n } from '../../i18n/context';

// <bdi> isolates the name, so a right-to-left or mixed name cannot reorder the
// punctuation and numbers around it. A Removed Student's displayName is the
// API's English, so `removed` shows the dictionary's tombstone in its place.
// Where markup cannot go (alt, title, aria-label, <option>), use
// useI18n().personNameText.
export interface PersonNameProps extends Omit<ComponentProps<'bdi'>, 'children'> {
  name: string;
  removed: boolean;
}

export function PersonName({ name, removed, ...rest }: PersonNameProps): React.JSX.Element {
  const { t } = useI18n();
  return <bdi {...rest}>{removed ? t.people.tombstone : name}</bdi>;
}
