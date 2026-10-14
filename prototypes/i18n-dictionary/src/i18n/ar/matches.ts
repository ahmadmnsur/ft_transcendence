import type matches from '../en/matches';
import type { Catalogue } from '../types';

export default {
  canTeach: 'يستطيع {partner} أن يعلّمك {skills}.',
  evidenceLimit: 'ملفات الدليل حتى {size} كيلوبايت.',
} as const satisfies Catalogue<'ar', typeof matches>;
