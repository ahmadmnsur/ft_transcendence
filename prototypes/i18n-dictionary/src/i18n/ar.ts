import type en from './en';
import type { Catalogue, NoExtra } from './types';

const ar = {
  nav: { privacy: 'سياسة الخصوصية', terms: 'شروط الخدمة' },
  inbox: {
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
  },
  errors: {
    validation_failed: 'تحقّق من الحقول المحدّدة.',
    not_found: 'غير موجود.',
    internal_error: 'حدث خطأ ما.',
  },
  insights: {
    gapSome: {
      text: '{demand} تعلّم {skill}، {supply}.',
      parts: {
        demand: { zero: 'لا أحد يريد', one: 'طالب واحد يريد', two: 'طالبان يريدان', few: '{count} طلاب يريدون', many: '{count} طالبًا يريدون', other: '{count} طالب يريدون' },
        supply: { zero: 'ولا أحد يعلّمها', one: 'ولا يعلّمها إلا واحد', two: 'ولا يعلّمها إلا اثنان', few: 'ولا يعلّمها إلا {count}', many: 'ولا يعلّمها إلا {count}', other: 'ولا يعلّمها إلا {count}' },
      },
    },
  },
} as const satisfies Catalogue<'ar', typeof en>;

export const arChecked: NoExtra<typeof ar, typeof en> = true;
export default ar;
