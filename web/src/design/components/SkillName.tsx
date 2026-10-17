import type { ComponentProps } from 'react';
import { isolate } from '../../i18n/text';

// <bdi> isolates the Skill's name, so its own direction holds inside any
// sentence: on an Arabic page C++ reads C++, never ++C. Skill names are never
// translated. Inside a message, format() isolates a value by itself; where
// markup cannot go (an <option>, title, aria-label), use skillNameText.
export interface SkillNameProps extends Omit<ComponentProps<'bdi'>, 'children'> {
  name: string;
}

export function SkillName({ name, ...rest }: SkillNameProps): React.JSX.Element {
  return <bdi {...rest}>{name}</bdi>;
}

// The name as plain text, between U+2068 and U+2069.
export const skillNameText = (name: string): string => isolate(name);
