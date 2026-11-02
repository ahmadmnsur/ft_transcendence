import type en from '../en/prompts';
import type { Catalogue } from '../types';

export default {
  title: 'مواضيع التأمل', adminTitle: 'نشر موضوع تأمل', live: 'مفتوح', closed: 'مغلق',
  history: 'سجل المواضيع', noPrompts: 'لم تنشر مواضيع تأمل بعد.', loading: 'جار تحميل مواضيع التأمل…',
  answers: 'الإجابات',
  answerCount: {
    zero: 'لا إجابات', one: 'إجابة واحدة', two: 'إجابتان',
    few: '{count} إجابات', many: '{count} إجابة', other: '{count} إجابة',
  },
  noAnswers: 'لا توجد إجابات بعد.',
  answerPages: 'صفحات الإجابات',
  question: 'سؤال التأمل', publish: 'نشر', publishing: 'جار النشر…', published: 'تم نشر موضوع التأمل.',
  publishHint: 'يؤدي النشر إلى إغلاق الموضوع السابق. لا يمكن تعديل الأسئلة والإجابات أو حذفها.',
  textLimit: {
    zero: 'من {min} إلى {count} حرف.',
    one: 'من {min} إلى حرف واحد.',
    two: 'من {min} إلى حرفين.',
    few: 'من {min} إلى {count} أحرف.',
    many: 'من {min} إلى {count} حرفا.',
    other: 'من {min} إلى {count} حرف.',
  },
  textEmpty: {
    zero: 'أدخل من {min} إلى {count} حرف.',
    one: 'أدخل من {min} إلى حرف واحد.',
    two: 'أدخل من {min} إلى حرفين.',
    few: 'أدخل من {min} إلى {count} أحرف.',
    many: 'أدخل من {min} إلى {count} حرفا.',
    other: 'أدخل من {min} إلى {count} حرف.',
  },
  textInvalid: {
    zero: 'أدخل من {min} إلى {count} حرف. احذف محارف التحكم غير المسموحة.',
    one: 'أدخل من {min} إلى حرف واحد. احذف محارف التحكم غير المسموحة.',
    two: 'أدخل من {min} إلى حرفين. احذف محارف التحكم غير المسموحة.',
    few: 'أدخل من {min} إلى {count} أحرف. احذف محارف التحكم غير المسموحة.',
    many: 'أدخل من {min} إلى {count} حرفا. احذف محارف التحكم غير المسموحة.',
    other: 'أدخل من {min} إلى {count} حرف. احذف محارف التحكم غير المسموحة.',
  },
  confirmTitle: 'نشر موضوع التأمل هذا؟', cancel: 'إلغاء',
  answerLabel: 'إجابتك', answerHint: 'تظهر إجابتك فورا لكل طالب مسجل الدخول. يمكنك الإجابة مرة واحدة، ولا يمكنك تعديلها أو حذفها.',
  submit: 'نشر الإجابة', submitting: 'جار نشر الإجابة…', answered: 'لقد أجبت على موضوع التأمل هذا.',
  saved: 'تم نشر إجابتك.', retry: 'إعادة المحاولة', back: 'كل مواضيع التأمل',
} as const satisfies Catalogue<'ar', typeof en>;
