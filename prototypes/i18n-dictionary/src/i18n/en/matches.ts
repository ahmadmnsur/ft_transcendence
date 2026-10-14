import type { EnGroup } from '../types';

export default {
  canTeach: '{partner} can teach you {skills}.',
  evidenceLimit: 'Evidence files up to {size} KB.',
} as const satisfies EnGroup;
