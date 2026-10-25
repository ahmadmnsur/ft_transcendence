import type en from '../en/landing';
import type { Catalogue } from '../types';

export default {
  question: 'Je veux apprendre {learn} et je peux enseigner {teach}.',
  learnLabel: 'Une Compétence que vous voulez apprendre',
  teachLabel: 'Une Compétence que vous pouvez enseigner',
  lead: 'À chaque Tour, la mise en relation associe les Étudiants de 42 deux par deux : le Mentor enseigne une Compétence que le Mentoré veut apprendre, et tous deux savent exactement pourquoi.',
  signUp: "S'inscrire et lister vos Compétences",
  example: {
    label: 'Exemple, avec un nom inventé',
    title: 'Votre Match du Tour {number}',
    heading: 'Exemple, avec un nom inventé : votre Match du Tour {number}',
    partner: 'Maya',
    goalLabel: "{skill} est mon Objectif d'apprentissage",
    mentorWhy: "{partner} enseigne votre Objectif d'apprentissage, donc le Match obtient un meilleur Score avec {partner} comme Mentor.",
    mentorTie: "Sans Objectif d'apprentissage, les deux sens possibles obtiennent le même Score, et une règle fixe désigne le Mentor.",
  },
  round: {
    heading: 'Comment se déroule un Tour',
    skillsTitle: 'Listez vos Compétences',
    skillsBody: "Celles que vous pouvez enseigner et celles que vous voulez apprendre, dans un catalogue que partagent tous les Étudiants. Vous pouvez en choisir une comme Objectif d'apprentissage.",
    matchTitle: 'Recevez votre Match',
    matchBody: "Quand un Admin ouvre un Tour, la mise en relation se fait aussitôt. Chaque Match qu'elle crée a un Mentor, un Mentoré et un Score de compatibilité avec ses raisons, fixés dès sa création.",
    meetTitle: 'Rencontrez-vous',
    meetBody: 'Acceptez le Match, ou refusez-le. Sa Mission suggère comment vous retrouver, par exemple une session de programmation en binôme ou une relecture de code.',
    reviewTitle: 'Rédigez le Bilan',
    reviewBody: "Le Mentoré note ce qu'il a appris. Quand il soumet le Bilan, vous gagnez tous les deux des XP.",
  },
  review: {
    heading: 'Ce que consigne un Bilan, et qui le lit',
    intro: "Un Bilan a trois parties distinctes, et aucune n'est modifiée une fois soumise.",
    outcomeBody: 'Ce que le Mentoré a appris et sait maintenant faire. Lu par vous deux et par les Admins.',
    feedbackBody: "Deux réponses écrites et une note facultative de {min} à {max}. Lu par le Mentor, par les Admins et par le Mentoré qui l'a écrit.",
    takeawayBody: "Une ligne, publiée sur le fil d'actualité pour tous les Étudiants connectés. Elle ne nomme jamais le Mentor.",
  },
  prompts: {
    heading: 'Entre deux Matchs, une question pour tous',
    body: "Un Admin publie un Sujet de réflexion. Vous pouvez y répondre une fois, et votre réponse devient une Publication sur le fil d'actualité. Les Publications reçoivent des J'aime, jamais de commentaires.",
    exampleLabel: 'Exemple de Sujet de réflexion',
    exampleQuestion: "Qu'est-ce que quelqu'un vous a mieux expliqué que la documentation ?",
  },
  grow: {
    heading: "Une seule réserve d'XP, dix Niveaux, trois Badges",
    body: "Les Bilans et les réponses aux Sujets de réflexion alimentent les mêmes XP, et votre Niveau en découle. Un Badge obtenu n'est jamais retiré. Le Classement range les Étudiants par XP.",
    badges: {
      FIRST_MENTOR: "La première fois qu'un Mentoré soumet le Bilan d'un Match dont vous étiez le Mentor.",
      KNOWLEDGE_SHARER: 'Pour avoir répondu à trois Sujets de réflexion.',
      CONSISTENT_LEARNER: 'Pour une Série de trois Tours, chacun avec un Match terminé ou une réponse à un Sujet de réflexion.',
    },
  },
  close: {
    heading: 'Votre premier Match commence par deux listes.',
    body: 'Inscrivez-vous et listez ce que vous pouvez enseigner et ce que vous voulez apprendre. Quand un Admin ouvrira le prochain Tour, la mise en relation vous inclura.',
  },
} as const satisfies Catalogue<'fr', typeof en>;
