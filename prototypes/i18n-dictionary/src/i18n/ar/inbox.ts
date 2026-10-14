import type inbox from '../en/inbox';
import type { Catalogue } from '../types';

export default {
  title: 'البريد الوارد',
  unread: {
    zero: 'لا رسائل غير مقروءة',
    one: 'رسالة واحدة غير مقروءة',
    two: 'رسالتان غير مقروءتين',
    few: '{count} رسائل غير مقروءة',
    many: '{count} رسالة غير مقروءة',
    other: '{count} رسالة غير مقروءة',
  },
  sentYou: 'رسالة جديدة من {name}',
} as const satisfies Catalogue<'ar', typeof inbox>;
