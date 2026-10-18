import type shell from '../en/shell';
import type { Catalogue } from '../types';

export default {
  skipLink: 'الانتقال إلى المحتوى الرئيسي',
  pageTitle: '{page} · {brand}',
  header: {
    navLabel: 'الحساب',
    studentsLink: 'الطلاب',
    profileLink: 'ملفي الشخصي',
    signOut: 'تسجيل الخروج',
    signingOut: 'جار تسجيل الخروج…',
    signOutFailed: 'فشل تسجيل الخروج. حاول مرة أخرى.',
    signInLink: 'تسجيل الدخول',
    signUpLink: 'إنشاء حساب',
  },
  language: { label: 'اللغة' },
  footer: { privacy: 'سياسة الخصوصية', terms: 'شروط الاستخدام' },
  notFound: {
    name: 'الصفحة غير موجودة',
    title: 'هذه الصفحة غير موجودة.',
    description: 'تحقق من صحة الرابط، أو ارجع إلى الصفحة الرئيسية.',
    homeLink: 'العودة إلى الصفحة الرئيسية',
  },
  error: {
    name: 'حدث خطأ ما',
    title: 'تعذر عرض هذه الصفحة.',
    description: 'حاول مرة أخرى بعد لحظة.',
    retry: 'إعادة المحاولة',
  },
} as const satisfies Catalogue<'ar', typeof shell>;
