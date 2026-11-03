import type { ReportReason } from '@shared/reports';
import type en from '../en/reports';
import type { Catalogue } from '../types';

const reasons = {
  HARASSMENT: 'تحرش',
  SPAM: 'محتوى غير مرغوب فيه',
  INAPPROPRIATE_CONTENT: 'محتوى غير لائق',
  OTHER: 'سبب آخر',
} as const satisfies Record<ReportReason, string>;

export default {
  reasons,
  report: 'إبلاغ',
  postTitle: 'الإبلاغ عن منشور كتبه {name}',
  studentTitle: 'الإبلاغ عن {name}',
  reason: 'السبب',
  chooseReason: 'اختر سببا',
  reasonRequired: 'اختر سببا.',
  textLabel: 'التفاصيل (اختياري)',
  textHint: 'حتى {limit} حرف. لا يمكن تعديل البلاغ أو سحبه.',
  textTooLong: 'اجعل التفاصيل في حدود {limit} حرف.',
  textInvalid: 'احذف علامات الجدولة وغيرها من المحارف غير المرئية من التفاصيل.',
  postNotice: 'يراجع المشرفون الطلابيون والمسؤولون المنشورات المبلغ عنها. يرى المسؤولون من قدم البلاغ، أما المشرفون الطلابيون فلا، ولا يتم إعلام كاتب المنشور.',
  studentNotice: 'يراجع المسؤولون البلاغات المقدمة عن طالب ويرون من قدمها. لا يتم إعلام {name}.',
  submit: 'إرسال البلاغ',
  submitting: 'جار الإرسال…',
  cancel: 'إلغاء',
  close: 'إغلاق',
  received: 'تم استلام بلاغك.',
} as const satisfies Catalogue<'ar', typeof en>;
