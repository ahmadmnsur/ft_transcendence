import type people from '../en/people';
import type { Catalogue } from '../types';

export default {
  tombstone: 'Ancien étudiant',
  search: {
    title: 'Étudiants',
    filtersLabel: 'Rechercher des Étudiants',
    nameLabel: 'Nom',
    nameInvalid: {
      one: 'Saisissez au plus {count} caractère.',
      many: 'Saisissez au plus {count} de caractères.',
      other: 'Saisissez au plus {count} caractères.',
    },
    teachesLabel: 'Peut enseigner',
    wantsLabel: 'Veut apprendre',
    anySkill: 'Toutes les Compétences',
    goalLabel: "Objectif d'apprentissage",
    goalAny: 'Indifférent',
    goalYes: "Avec un Objectif d'apprentissage",
    goalNo: "Sans Objectif d'apprentissage",
    submit: 'Rechercher',
    clear: 'Effacer les filtres',
    retry: 'Réessayer',
    sortLabel: 'Trier par',
    sort: {
      nameAsc: 'Nom, de A à Z',
      nameDesc: 'Nom, de Z à A',
      xpDesc: 'XP, ordre décroissant',
      xpAsc: 'XP, ordre croissant',
      joinedDesc: "Étudiants les plus récents d'abord",
      joinedAsc: "Étudiants les plus anciens d'abord",
    },
    count: {
      one: '{count} Étudiant trouvé',
      many: "{count} d'Étudiants trouvés",
      other: '{count} Étudiants trouvés',
    },
    caption: 'Étudiants trouvés',
    columns: {
      name: 'Nom',
      teaches: 'Peut enseigner',
      wants: 'Veut apprendre',
      level: 'Niveau',
      xp: 'XP',
    },
    noSkills: 'Aucune',
    emptyTitle: 'Aucun Étudiant ne correspond à cette recherche.',
    emptyDescription: 'Essayez un autre nom, ou retirez des filtres.',
  },
} as const satisfies Catalogue<'fr', typeof people>;
