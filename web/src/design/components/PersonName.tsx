import type { ComponentProps } from 'react';
import { useI18n } from '../../i18n/context';

export interface PersonNameProps extends Omit<ComponentProps<'bdi'>, 'children'> {
  name: string;
  removed: boolean;
}

export function PersonName({ name, removed, ...rest }: PersonNameProps): React.JSX.Element {
  const { t } = useI18n();
  return <bdi {...rest}>{removed ? t.people.tombstone : name}</bdi>;
}
