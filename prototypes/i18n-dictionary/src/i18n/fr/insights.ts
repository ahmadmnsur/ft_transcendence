import type insights from '../en/insights';
import type { Catalogue } from '../types';

export default {
  gapSome: {
    text: '{demand} apprendre {skill} ; {supply}.',
    parts: {
      demand: { one: '{count} étudiant veut', many: '{count} d’étudiants veulent', other: '{count} étudiants veulent' },
      supply: { one: 'seulement {count} peut l’enseigner', many: 'seulement {count} peuvent l’enseigner', other: 'seulement {count} peuvent l’enseigner' },
    },
  },
} as const satisfies Catalogue<'fr', typeof insights>;
