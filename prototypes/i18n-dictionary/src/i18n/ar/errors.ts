import type errors from '../en/errors';
import type { Catalogue } from '../types';

export default {
  validation_failed: 'تحقّق من الحقول المحدّدة.',
  not_found: 'غير موجود.',
  internal_error: 'حدث خطأ ما.',
} as const satisfies Catalogue<'ar', typeof errors>;
