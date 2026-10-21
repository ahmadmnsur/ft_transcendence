import type en from '../en/prompts';
import type { Catalogue } from '../types';

export default {
  title: 'مواضيع التأمل', adminTitle: 'نشر موضوع تأمل', live: 'مفتوح', closed: 'مغلق',
  history: 'سجل المواضيع', noPrompts: 'لم تنشر مواضيع تأمل بعد.', loading: 'جار تحميل مواضيع التأمل…',
  answers: 'الإجابات', answerCount: 'الإجابات: {count}', noAnswers: 'لا توجد إجابات بعد.',
  question: 'سؤال التأمل', publish: 'نشر', publishing: 'جار النشر…', published: 'تم نشر موضوع التأمل.',
  publishHint: 'يؤدي النشر إلى إغلاق الموضوع السابق. لا يمكن تعديل الأسئلة والإجابات أو حذفها.',
  confirmTitle: 'نشر موضوع التأمل هذا؟', cancel: 'إلغاء',
  answerLabel: 'إجابتك', answerHint: 'تظهر إجابتك فورا لكل طالب مسجل الدخول. يمكنك الإجابة مرة واحدة، ولا يمكنك تعديلها أو حذفها.',
  submit: 'نشر الإجابة', submitting: 'جار نشر الإجابة…', answered: 'لقد أجبت على موضوع التأمل هذا.',
  saved: 'تم نشر إجابتك.', more: 'تحميل المزيد من الإجابات', retry: 'إعادة المحاولة', back: 'كل مواضيع التأمل',
} as const satisfies Catalogue<'ar', typeof en>;
