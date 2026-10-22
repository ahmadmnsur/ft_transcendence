import type en from '../en/progress';
import type { Catalogue } from '../types';

export default {
  title: 'التقدم', loading: 'جار تحميل التقدم…', retry: 'إعادة المحاولة',
  level: 'المستوى {level}', totalXp: '{xp} XP إجمالا', levelProgress: '{earned} / {needed} XP',
  cap: 'بلغت المستوى الأقصى. تستمر في كسب XP.', earned: 'كسبت +{xp} XP',
  badges: 'الشارات', noBadges: 'لا توجد شارات بعد. راجع القواعد لمعرفة كيفية كسبها.',
  newlyAwarded: 'الشارات المكتسبة', awardedAt: 'اكتسبت في {date}',
  badgeNames: { FIRST_MENTOR: 'أول إرشاد', KNOWLEDGE_SHARER: 'مشاركة المعرفة', CONSISTENT_LEARNER: 'متعلم مواظب' },
  badgeConditions: {
    FIRST_MENTOR: 'أكمل أول مطابقة لك كمرشد عندما يقدم المسترشد مراجعة.',
    KNOWLEDGE_SHARER: 'أجب عن ثلاثة مواضيع تأمل على الأقل. تحتسب الإجابات التي أزيلت من الموجز أيضا.',
    CONSISTENT_LEARNER: 'حقق مواظبة لثلاث جولات. تكفي مطابقة مكتملة أو إجابة عن موضوع تأمل خلال الجولة؛ تعود المواظبة إلى الصفر عند غيابهما. يجمدها التعليق أو الاستبعاد.',
  },
  rules: {
    title: 'XP والمستويات والشارات', nav: 'القواعد', link: 'كيفية كسب XP والشارات', xpHeading: 'كسب XP',
    event: 'النشاط', mentor: 'المرشد', mentee: 'المسترشد أو الكاتب', review: 'تقديم مراجعة لمطابقة مقبولة', answer: 'الإجابة عن موضوع تأمل',
    award: '+{xp} XP', noAward: 'لا XP',
    onlyThese: 'هذه الأنشطة وحدها تمنح XP. يحصل الطالبان على XP عندما يقدم المسترشد المراجعة: {matchXp} XP لكل منهما و{reviewXp} XP إضافية للمسترشد. قبول المطابقة والإعجابات والصداقات والرسائل المباشرة لا تمنح XP. المطابقة دون مراجعة أو المرفوضة أو المنهاة لا تمنح أحدا XP.',
    permanent: 'لا تسحب XP أو الشارات أبدا، حتى عند إزالة منشور. يمكن كسب كل شارة مرة واحدة.',
    levelsHeading: 'المستويات العشرة', levelColumn: 'المستوى', bandColumn: 'إجمالي XP', band: '{min}–{max} XP', terminalBand: '{min}+ XP',
    levelsIntro: 'تبدأ بالمستوى {startLevel}. كل {step} XP تنقلك إلى مستوى آخر حتى المستوى {maxLevel} عند {cap} XP. يبقى شريط التقدم ممتلئا في المستوى الأقصى مع استمرار تراكم XP.',
    badgesHeading: 'الشارات الثلاث',
    streakTiming: 'تحدث المواظبة عند إغلاق الجولة. الإجابة دون جولة مفتوحة تمنح XP وتحتسب لمشاركة المعرفة، لكنها لا تزيد المواظبة.',
  },
} as const satisfies Catalogue<'ar', typeof en>;
