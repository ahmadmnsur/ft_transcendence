import type en from '../en/feed';
import type { Catalogue } from '../types';

export default {
  title: 'آخر المنشورات',
  loading: 'جار تحميل المنشورات…',
  emptyTitle: 'لا توجد منشورات بعد.',
  emptyDescription: 'تظهر هنا الخلاصات العامة والإجابات على مواضيع التأمل.',
  pages: 'صفحات آخر المنشورات',
  retry: 'إعادة المحاولة',
  post: {
    takeaway: 'خلاصة عامة',
    answer: 'إجابة على {question}',
    like: 'إعجاب',
    likeCount: {
      zero: 'لا إعجابات', one: 'إعجاب واحد', two: 'إعجابان',
      few: '{count} إعجابات', many: '{count} إعجابا', other: '{count} إعجاب',
    },
  },
  likers: {
    title: 'من أعجب بهذا المنشور',
    loading: 'جار تحميل من أعجب بهذا المنشور…',
    empty: 'لم يعجب أحد بهذا المنشور بعد.',
    retry: 'إعادة المحاولة',
  },
  profile: {
    heading: 'المنشورات',
    empty: 'لا توجد منشورات بعد.',
    pages: 'صفحات المنشورات',
  },
} as const satisfies Catalogue<'ar', typeof en>;
