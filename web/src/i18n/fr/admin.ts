import type admin from '../en/admin';
import type { Catalogue } from '../types';

export default {
  roles: {
    STUDENT: 'Étudiant',
    PEER_MODERATOR: 'Modérateur étudiant',
    ADMIN: 'Admin',
  },
  statuses: {
    ACTIVE: 'Actif',
    SUSPENDED: 'Suspendu',
    REMOVED: 'Exclu',
  },
  home: {
    title: 'Outils d’Admin',
    description: 'Tout ce qu’un Admin gère, au même endroit.',
    rounds: 'Ouvrez et fermez les Tours, suivez leurs Matchs et créez un Match à la main.',
    prompts: 'Publiez le prochain Sujet de réflexion et consultez les précédents.',
    users: 'Trouvez un compte par nom, e-mail, rôle ou statut, changez son rôle ou modifiez son profil.',
    analytics: 'Ce que les Étudiants souhaitent apprendre et peuvent enseigner, et où en sont leurs Matchs.',
    reports: 'Traitez les Signalements ouverts visant des Publications et des Étudiants, et consultez ceux déjà résolus.',
  },
  users: {
    title: 'Utilisateurs',
    filtersLabel: 'Rechercher des utilisateurs',
    queryLabel: 'Nom ou e-mail',
    queryInvalid: {
      one: 'Saisissez au plus {count} caractère.',
      many: 'Saisissez au plus {count} de caractères.',
      other: 'Saisissez au plus {count} caractères.',
    },
    roleLabel: 'Rôle',
    anyRole: 'Tous les rôles',
    statusLabel: 'Statut',
    anyStatus: 'Tous les statuts',
    submit: 'Rechercher',
    clear: 'Effacer les filtres',
    count: {
      one: '{count} compte trouvé',
      many: '{count} de comptes trouvés',
      other: '{count} comptes trouvés',
    },
    caption: 'Comptes',
    columns: {
      name: 'Nom',
      email: 'E-mail',
      role: 'Rôle',
      status: 'Statut',
    },
    emptyTitle: 'Aucun compte ne correspond à cette recherche.',
    emptyDescription: 'Essayez un autre nom ou un autre e-mail, ou retirez des filtres.',
  },
  user: {
    loading: 'Chargement de ce compte…',
    retry: 'Réessayer',
    usersLink: 'Tous les utilisateurs',
    emailLabel: 'E-mail',
    roleLabel: 'Rôle',
    statusLabel: 'Statut',
    publicProfileLink: 'Voir son profil public',
    removedNote: 'Ce compte a été exclu. Il reste en lecture seule : rien ne peut y être modifié.',
    suspendedNote: "Ce compte est suspendu. Cet Étudiant ne peut pas se connecter tant qu'un Admin ne l'a pas réintégré.",
    role: {
      title: 'Rôle',
      subtitle: "S'applique dès sa prochaine requête, sans le déconnecter.",
      label: 'Nouveau rôle',
      submit: 'Changer le rôle',
      submitting: 'Changement…',
      self: 'Vous ne pouvez pas changer votre propre rôle. Un autre Admin le peut.',
      unchanged: 'Choisissez un rôle différent de son rôle actuel.',
      changed: 'Son rôle est maintenant {role}.',
      confirm: {
        title: 'Changer le rôle de {name} en {role} ?',
        toAdmin:
          "Un Admin fait partie de l'équipe : jamais associé dans un nouveau Tour, il ne répond jamais à un Sujet de réflexion et n'apparaît jamais au Classement. Son XP, son Niveau, sa Série, ses Badges et ses Publications restent, et un Match créé avant ce changement se termine normalement.",
        fromAdmin:
          "Cet Étudiant participe de nouveau : associé dès le prochain Tour, présent au Classement et autorisé à répondre aux Sujets de réflexion. Rien n'est recalculé.",
        toModerator:
          'Un Modérateur étudiant examine les Publications signalées et, pour le reste, participe comme tout Étudiant.',
        toStudent: 'Cet Étudiant continue de participer, sans examiner les Publications signalées.',
        cancel: 'Annuler',
        confirm: 'Changer le rôle',
      },
    },
    matches: {
      title: 'Matchs',
      caption: 'Ses Matchs',
      columns: {
        round: 'Tour',
        role: 'Son rôle',
        partner: 'Partenaire',
        status: 'Statut',
      },
      view: 'Voir',
      viewNamed: 'Voir le Match du Tour {number}',
      emptyTitle: 'Aucun Match pour le moment.',
    },
  },
  cards: {
    avatar: {
      subtitle: 'Affiché à côté de son nom pour tous les Étudiants connectés.',
      currentAlt: "L'avatar de cet Étudiant",
      saved: "L'avatar a été mis à jour.",
      removed: "L'avatar a été supprimé. Son profil affiche l'avatar par défaut.",
      confirmTitle: 'Supprimer cet avatar ?',
      confirmBody: "Son profil affichera l'avatar par défaut jusqu'à l'envoi d'un nouveau.",
    },
    details: {
      subtitle:
        "Son nom d'affichage, et l'e-mail avec lequel cet Étudiant se connecte. Aucun e-mail ne lui est envoyé.",
      saved: 'Le profil a été mis à jour.',
    },
    skills: {
      subtitle:
        "Les deux listes apparaissent sur son profil, et le prochain Tour s'appuie sur ces Compétences pour l'associer.",
      teachHeading: 'Compétences à enseigner',
      learnHeading: 'Compétences à apprendre',
      nothingToAdd: 'Toutes les Compétences du catalogue figurent déjà ici.',
      goalWillClear:
        "L'enregistrement effacera son Objectif d'apprentissage, car sa Compétence ne figure plus dans sa liste d'apprentissage.",
      saved: 'Les Compétences ont été enregistrées.',
      goalCleared:
        "Son Objectif d'apprentissage a été effacé, car sa Compétence a quitté sa liste d'apprentissage.",
    },
    goal: {
      subtitle:
        "Une Compétence de sa liste d'apprentissage, la plus importante pour cet Étudiant en ce moment, avec une phrase qui explique pourquoi.",
      chooseSkillError: "Choisissez une Compétence de sa liste d'apprentissage.",
      noLearn:
        "Sa liste d'apprentissage est vide : un Objectif d'apprentissage désigne l'une de ses Compétences.",
      saved: "L'Objectif d'apprentissage a été enregistré.",
      cleared: "L'Objectif d'apprentissage a été effacé.",
    },
  },
} as const satisfies Catalogue<'fr', typeof admin>;
