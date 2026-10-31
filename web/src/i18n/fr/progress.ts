import type en from '../en/progress';
import type { Catalogue } from '../types';

export default {
  title: 'Progression', loading: 'Chargement de la progression…', retry: 'Réessayer',
  level: 'Niveau {level}', totalXp: '{xp} XP au total', levelProgress: '{earned} / {needed} XP vers le Niveau {next}',
  cap: 'Niveau maximal atteint. Vous continuez à gagner des XP.', earned: '+{xp} XP gagnés',
  badges: 'Badges', noBadges: 'Aucun Badge pour le moment. Consultez les règles pour savoir comment les gagner.',
  newlyAwarded: 'Badges gagnés', awardedAt: 'Gagné le {date}',
  badgeNames: { FIRST_MENTOR: 'Premier Mentor', KNOWLEDGE_SHARER: 'Partage de connaissances', CONSISTENT_LEARNER: 'Apprentissage assidu' },
  badgeConditions: {
    FIRST_MENTOR: 'Terminez votre premier Match comme Mentor lorsque votre Mentoré soumet un Bilan.',
    KNOWLEDGE_SHARER: 'Répondez à au moins trois Sujets de réflexion. Les réponses retirées du fil comptent toujours.',
    CONSISTENT_LEARNER: 'Atteignez une Série de trois Tours. Un Match terminé ou une réponse à un Sujet de réflexion pendant un Tour suffit ; un Tour sans aucune de ces activités remet votre Série à zéro. La Suspension ou l’Exclusion la fige.',
  },
  rules: {
    title: 'XP, Niveaux et Badges', nav: 'Règles', link: 'Comment gagner des XP et des Badges', xpHeading: 'Gagner des XP',
    event: 'Activité', mentor: 'Mentor', mentee: 'Mentoré ou auteur', review: 'Bilan soumis sur un Match accepté', answer: 'Réponse à un Sujet de réflexion',
    award: '+{xp} XP', noAward: 'Aucun XP',
    onlyThese: 'Seules ces activités rapportent des XP. Un Match rémunère les deux Étudiants lorsque le Mentoré soumet son Bilan : {matchXp} XP chacun, plus {reviewXp} XP pour le Mentoré. Accepter un Match, les J’aime, les Amitiés et les Messages directs ne rapportent aucun XP. Un Match sans Bilan, refusé ou terminé par un Admin ne rapporte rien.',
    permanent: 'Les XP et les Badges ne sont jamais retirés, même si une Publication est retirée. Chaque Badge ne peut être gagné qu’une fois.',
    levelsHeading: 'Les dix Niveaux', levelColumn: 'Niveau', bandColumn: 'Total des XP', band: '{min}–{max} XP', terminalBand: '{min}+ XP',
    levelsIntro: 'Vous commencez au Niveau {startLevel}. Chaque tranche de {step} XP vous fait avancer d’un Niveau, jusqu’au Niveau {maxLevel} à {cap} XP. La barre reste pleine au Niveau maximal et les XP continuent de s’accumuler.',
    badgesHeading: 'Les trois Badges',
    streakTiming: 'La Série est mise à jour à la clôture du Tour. Une réponse sans Tour ouvert rapporte des XP et compte pour Partage de connaissances, mais ne fait pas avancer la Série.',
  },
} as const satisfies Catalogue<'fr', typeof en>;
