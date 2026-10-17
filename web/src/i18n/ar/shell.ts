import type shell from '../en/shell';
import type { Catalogue } from '../types';

export default {
  header: {
    navLabel: 'الحساب',
    profileLink: 'ملفي الشخصي',
    signOut: 'تسجيل الخروج',
    signingOut: 'جار تسجيل الخروج…',
    signOutFailed: 'فشل تسجيل الخروج. حاول مرة أخرى.',
    signInLink: 'تسجيل الدخول',
    signUpLink: 'إنشاء حساب',
  },
  language: { label: 'اللغة' },
  footer: { privacy: 'سياسة الخصوصية', terms: 'شروط الاستخدام' },
} as const satisfies Catalogue<'ar', typeof shell>;
