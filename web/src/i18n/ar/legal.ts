import type legal from '../en/legal';
import type { Catalogue } from '../types';

export default {
  privacyTitle: 'سياسة الخصوصية',
  termsTitle: 'شروط الاستخدام',
} as const satisfies Catalogue<'ar', typeof legal>;
