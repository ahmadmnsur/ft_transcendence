import type social from '../en/social';
import type { Catalogue } from '../types';

export default {
  friends: {
    title: 'الأصدقاء',
  },
  actions: {
    block: 'حظر',
    blocking: 'جار الحظر…',
    unblock: 'إلغاء الحظر',
    unblocking: 'جار إلغاء الحظر…',
    cancel: 'إلغاء',
    retry: 'إعادة المحاولة',
    blocked: 'لقد حظرت {name}.',
    unblocked: 'لقد ألغيت حظر {name}. إذا كنتما صديقين قبل الحظر، فعليك إرسال طلب صداقة جديد.',
    unblockedRemoved: 'لقد ألغيت حظر {name}.',
  },
  profile: {
    blockedNote: 'لقد حظرت هذا الطالب.',
    confirmTitle: 'حظر {name}؟',
    confirmBody:
      'لن يتمكن أي منكما من إرسال طلب صداقة أو رسالة مباشرة إلى الآخر، ولن تجمعكما مطابقة. وإذا كنتما صديقين أو كان هناك طلب صداقة بانتظار الرد، فسينتهي ذلك أيضا. أما المطابقة الجارية فتبقى. لن يتم إبلاغ {name}.',
    confirm: 'حظر',
  },
  blocks: {
    title: 'قائمة الحظر',
    subtitle: 'لا يرى هذه القائمة أحد غيرك. لا يتم إبلاغ الطالب الذي تحظره.',
    loading: 'جار تحميل قائمة الحظر…',
    emptyTitle: 'لم تحظر أي طالب.',
    emptyDescription: 'يمكنك حظر طالب من ملفه الشخصي.',
    blockedOn: 'تم الحظر في {date}',
    unblockNamed: 'إلغاء الحظر عن {name}',
  },
} as const satisfies Catalogue<'ar', typeof social>;
