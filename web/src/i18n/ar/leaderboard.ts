import type en from '../en/leaderboard';
import type { Catalogue } from '../types';

export default {
  title: 'لوحة الصدارة',
  description: 'إجمالي XP من المطابقات المكتملة والإجابات على مواضيع التأمل. يقتصر الترتيب على الطلاب والمشرفين الطلابيين النشطين.',
  caption: 'أول عشرة حسب XP، مع ترتيبك أدناه إن كنت خارج أول عشرة',
  rank: 'الترتيب',
  student: 'الطالب',
  xp: 'XP',
  level: 'المستوى',
  yourPosition: 'ترتيبك',
  loading: 'جار تحميل لوحة الصدارة…',
  retry: 'المحاولة مجددا',
  emptyTitle: 'لا يوجد طلاب لترتيبهم بعد',
  emptyDescription: 'ستظهر لوحة الصدارة عند انضمام طالب نشط.',
} as const satisfies Catalogue<'ar', typeof en>;
