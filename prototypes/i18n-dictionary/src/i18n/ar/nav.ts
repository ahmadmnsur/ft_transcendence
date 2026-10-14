import type nav from '../en/nav';
import type { Catalogue } from '../types';

export default { privacy: 'سياسة الخصوصية', terms: 'شروط الخدمة' } as const satisfies Catalogue<'ar', typeof nav>;
