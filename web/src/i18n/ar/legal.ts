import type legal from '../en/legal';
import type { Catalogue } from '../types';

export default {
  untitledTable: 'جدول',
  privacyTitle: 'سياسة الخصوصية',
  termsTitle: 'شروط الاستخدام',
} as const satisfies Catalogue<'ar', typeof legal>;
