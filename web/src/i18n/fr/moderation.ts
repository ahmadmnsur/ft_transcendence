import type { PostGroupAction, ResolvedState, StudentGroupAction } from '@shared/reports';
import type en from '../en/moderation';
import type { Catalogue } from '../types';

type GroupAction = PostGroupAction | StudentGroupAction;

const actionLabels = {
  REMOVE_POST: 'Retirer la Publication',
  ACTION: 'Marquer comme traité',
  DISMISS: 'Classer sans suite',
} as const satisfies Record<GroupAction, string>;

const confirmTitles = {
  post: {
    REMOVE_POST: 'Retirer la Publication de {name} ?',
    DISMISS: {
      one: 'Classer sans suite {count} Signalement visant la Publication de {name} ?',
      many: 'Classer sans suite {count} de Signalements visant la Publication de {name} ?',
      other: 'Classer sans suite {count} Signalements visant la Publication de {name} ?',
    },
  },
  student: {
    ACTION: {
      one: 'Marquer {count} Signalement visant {name} comme traité ?',
      many: 'Marquer {count} de Signalements visant {name} comme traités ?',
      other: 'Marquer {count} Signalements visant {name} comme traités ?',
    },
    DISMISS: {
      one: 'Classer sans suite {count} Signalement visant {name} ?',
      many: 'Classer sans suite {count} de Signalements visant {name} ?',
      other: 'Classer sans suite {count} Signalements visant {name} ?',
    },
  },
} as const;

const alreadyResolved = {
  post: {
    one: '{count} Signalement visant la Publication de {name} a déjà été résolu.',
    many: '{count} de Signalements visant la Publication de {name} ont déjà été résolus.',
    other: '{count} Signalements visant la Publication de {name} ont déjà été résolus.',
  },
  student: {
    one: '{count} Signalement visant {name} a déjà été résolu.',
    many: '{count} de Signalements visant {name} ont déjà été résolus.',
    other: '{count} Signalements visant {name} ont déjà été résolus.',
  },
} as const;

const postBodies = {
  REMOVE_POST: {
    one: "La Publication de {name} quitte le fil pour tout le monde, et {count} Signalement est clos comme traité. Vous êtes enregistré comme la personne qui l'a retirée. Ceci ne peut pas être annulé.",
    many: "La Publication de {name} quitte le fil pour tout le monde, et {count} de Signalements sont clos comme traités. Vous êtes enregistré comme la personne qui l'a retirée. Ceci ne peut pas être annulé.",
    other: "La Publication de {name} quitte le fil pour tout le monde, et {count} Signalements sont clos comme traités. Vous êtes enregistré comme la personne qui l'a retirée. Ceci ne peut pas être annulé.",
  },
  DISMISS: {
    one: "La Publication de {name} reste, et {count} Signalement est classé sans suite. Vous êtes enregistré comme la personne qui l'a classé. Ceci ne peut pas être annulé.",
    many: 'La Publication de {name} reste, et {count} de Signalements sont classés sans suite. Vous êtes enregistré comme la personne qui les a classés. Ceci ne peut pas être annulé.',
    other: 'La Publication de {name} reste, et {count} Signalements sont classés sans suite. Vous êtes enregistré comme la personne qui les a classés. Ceci ne peut pas être annulé.',
  },
} as const satisfies Record<PostGroupAction, object>;

const studentBodies = {
  ACTION: {
    one: "{count} Signalement visant {name} est clos comme traité. Aucune sanction n'est appliquée\u00A0: la Suspension et l'Exclusion se font depuis Utilisateurs. Vous êtes enregistré comme la personne qui l'a résolu. Ceci ne peut pas être annulé.",
    many: "{count} de Signalements visant {name} sont clos comme traités. Aucune sanction n'est appliquée\u00A0: la Suspension et l'Exclusion se font depuis Utilisateurs. Vous êtes enregistré comme la personne qui les a résolus. Ceci ne peut pas être annulé.",
    other: "{count} Signalements visant {name} sont clos comme traités. Aucune sanction n'est appliquée\u00A0: la Suspension et l'Exclusion se font depuis Utilisateurs. Vous êtes enregistré comme la personne qui les a résolus. Ceci ne peut pas être annulé.",
  },
  DISMISS: {
    one: "{count} Signalement visant {name} est classé sans suite. Vous êtes enregistré comme la personne qui l'a classé. Ceci ne peut pas être annulé.",
    many: '{count} de Signalements visant {name} sont classés sans suite. Vous êtes enregistré comme la personne qui les a classés. Ceci ne peut pas être annulé.',
    other: '{count} Signalements visant {name} sont classés sans suite. Vous êtes enregistré comme la personne qui les a classés. Ceci ne peut pas être annulé.',
  },
} as const satisfies Record<StudentGroupAction, object>;

const done = {
  post: {
    REMOVE_POST: {
      one: 'La Publication de {name} a été retirée, et {count} Signalement a été clos.',
      many: 'La Publication de {name} a été retirée, et {count} de Signalements ont été clos.',
      other: 'La Publication de {name} a été retirée, et {count} Signalements ont été clos.',
    },
    DISMISS: {
      one: '{count} Signalement visant la Publication de {name} a été classé sans suite.',
      many: '{count} de Signalements visant la Publication de {name} ont été classés sans suite.',
      other: '{count} Signalements visant la Publication de {name} ont été classés sans suite.',
    },
  } as const satisfies Record<PostGroupAction, object>,
  student: {
    ACTION: {
      one: '{count} Signalement visant {name} a été marqué comme traité.',
      many: '{count} de Signalements visant {name} ont été marqués comme traités.',
      other: '{count} Signalements visant {name} ont été marqués comme traités.',
    },
    DISMISS: {
      one: '{count} Signalement visant {name} a été classé sans suite.',
      many: '{count} de Signalements visant {name} ont été classés sans suite.',
      other: '{count} Signalements visant {name} ont été classés sans suite.',
    },
  } as const satisfies Record<StudentGroupAction, object>,
};

const postResolvedBy = {
  ACTIONED: 'Publication retirée par {name}',
  DISMISSED: 'Classé sans suite par {name}',
} as const satisfies Record<ResolvedState, string>;

const studentResolvedBy = {
  ACTIONED: 'Marqué comme traité par {name}',
  DISMISSED: 'Classé sans suite par {name}',
} as const satisfies Record<ResolvedState, string>;

export default {
  peerTitle: 'Modération',
  peerIntro: "Les Publications signalées en attente d'une décision. Vous ne voyez jamais qui a déposé un Signalement. Une Publication que vous avez écrite ou signalée est confiée à quelqu'un d'autre, tout comme une Publication dont l'auteur, ou une personne qui l'a signalée, est quelqu'un que vous avez bloqué ou qui vous a bloqué.",
  adminTitle: 'Signalements',
  adminIntro: "Les Signalements visant des Publications et des Étudiants, avec la personne qui a déposé chacun. Un Signalement qui vous vise, vous ou votre Publication, ou que vous avez déposé, est confié à un autre Admin.",
  tabsLabel: 'Signalements',
  openTab: 'Ouverts',
  resolvedTab: 'Résolus',
  loading: 'Chargement des Signalements…',
  retry: 'Réessayer',
  queue: {
    emptyTitle: 'Aucun Signalement à examiner.',
    peerEmpty: 'Les Publications signalées que vous pouvez examiner apparaissent ici.',
    adminEmpty: 'Les Signalements visant des Publications et des Étudiants apparaissent ici.',
    postGroup: 'Publication signalée',
    studentGroup: 'Étudiant signalé',
    postBy: 'Publication de {name}',
    reportCount: { one: '{count} Signalement', many: '{count} de Signalements', other: '{count} Signalements' },
    reportsLabel: 'Signalements de ce groupe',
    openInUsers: 'Ouvrir dans Utilisateurs',
    openNameInUsers: 'Ouvrir {name} dans Utilisateurs',
  },
  post: { removed: 'Retirée du fil', postedAt: 'Publiée le {time}' },
  report: {
    filedAt: 'Déposé le {time}',
    filedBy: 'Déposé par {name}',
    noText: 'Aucune précision donnée.',
  },
  actions: {
    label: actionLabels,
    confirmTitle: confirmTitles,
    confirmBody: { post: postBodies, student: studentBodies },
    done,
    alreadyResolved,
    noSanction: "Aucune sanction n'a été appliquée.",
    cancel: 'Annuler',
    working: 'Enregistrement…',
  },
  audit: {
    resolvedBy: { post: postResolvedBy, student: studentResolvedBy },
    resolvedAt: 'Résolu le {time}',
    emptyTitle: 'Aucun Signalement résolu pour le moment.',
    emptyDescription: "Chaque résolution apparaît ici, avec la personne qui l'a prise et chaque Signalement qu'elle a clos.",
    paginationLabel: 'Pages des Signalements résolus',
  },
} as const satisfies Catalogue<'fr', typeof en>;
