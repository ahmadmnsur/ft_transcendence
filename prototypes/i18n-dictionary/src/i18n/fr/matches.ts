import type matches from '../en/matches';
import type { Catalogue } from '../types';

export default {
  canTeach: '{partner} peut vous apprendre {skills}.',
  evidenceLimit: 'Fichiers de preuve jusqu’à {size} Ko.',
} as const satisfies Catalogue<'fr', typeof matches>;
