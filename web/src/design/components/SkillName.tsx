import type { ComponentProps } from 'react';
import { isolate } from '../../i18n/text';

export interface SkillNameProps extends Omit<ComponentProps<'bdi'>, 'children'> {
  name: string;
}

export function SkillName({ name, ...rest }: SkillNameProps): React.JSX.Element {
  return <bdi {...rest}>{name}</bdi>;
}

export const skillNameText = (name: string): string => isolate(name);
