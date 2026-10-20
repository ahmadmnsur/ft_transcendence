import type messages from '../en/messages';
import type { Catalogue } from '../types';

// §6.5, §7.3 and §7.4's screens in Modern Standard Arabic, without vowel
// marks. The word stays the product's: رسالة مباشرة, never a loanword for
// the screen names (CONTEXT.md's Direct Message entry).
export default {
  title: 'الرسائل المباشرة',
  list: {
    title: 'رسائلك المباشرة',
    subtitle: 'أنت فقط من يرى هذه القائمة.',
    loading: 'جار تحميل رسائلك المباشرة…',
    emptyTitle: 'لم تتبادل أي رسالة مباشرة بعد.',
    emptyDescription: 'يمكنك إرسال رسالة من الملف الشخصي لأي طالب.',
    showMore: 'عرض المزيد',
    yourMessage: 'أنت: {body}',
    unread: {
      zero: 'لا رسائل غير مقروءة',
      one: 'رسالة غير مقروءة',
      two: 'رسالتان غير مقروءتان',
      few: '{count} رسائل غير مقروءة',
      many: '{count} رسالة غير مقروءة',
      other: '{count} رسالة غير مقروءة',
    },
  },
  page: {
    loading: 'جار تحميل الرسائل…',
    heading: 'الرسائل المباشرة مع {name}',
    emptyTitle: 'لا توجد رسالة مباشرة مع {name} بعد.',
    emptyDescription: 'اكتب الرسالة الأولى أدناه.',
    composerLabel: 'رسالتك',
    send: 'إرسال',
    sending: 'جار الإرسال…',
    showEarlier: 'عرض الرسائل السابقة',
    ownSender: 'أنت',
    empty: 'اكتب رسالة أولا.',
    tooLong: 'اجعل الرسالة في حدود {limit} حرفا.',
    notConnected: 'أنت غير متصل. تحقق من الاتصال وحاول مرة أخرى.',
    mayHaveSaved: 'ربما تم إرسال الرسالة. تحقق من الرسائل أعلاه قبل إرسالها مرة أخرى.',
  },
  profile: {
    messageLink: 'إرسال رسالة مباشرة',
  },
} as const satisfies Catalogue<'ar', typeof messages>;
