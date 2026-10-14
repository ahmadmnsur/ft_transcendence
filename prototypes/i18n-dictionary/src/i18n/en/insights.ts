import type { EnGroup } from '../types';

export default {
  gapSome: {
    text: '{demand} to learn {skill}; {supply} it.',
    parts: {
      demand: { one: '{count} Student wants', other: '{count} Students want' },
      supply: { one: 'only {count} can teach', other: 'only {count} can teach' },
    },
  },
} as const satisfies EnGroup;
