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
    users: 'Trouvez un compte par nom, e-mail, rôle ou statut, changez son rôle, modifiez son profil, ou suspendez-le, réintégrez-le ou excluez-le.',
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
    sanctions: {
      title: 'Suspension et Exclusion',
      subtitle: 'Une Suspension peut être levée. Une Exclusion est définitive.',
      self: 'Vous ne pouvez pas suspendre ni exclure votre propre compte. Un autre Admin le peut.',
      suspend: 'Suspendre',
      reinstate: 'Réintégrer',
      remove: 'Exclure',
      working: 'Enregistrement…',
      suspended: 'Cet Étudiant est suspendu et déconnecté partout.',
      reinstated: 'Cet Étudiant est réintégré et peut se reconnecter.',
      confirm: {
        suspendTitle: 'Suspendre {name} ?',
        suspendBody:
          "Cet Étudiant est déconnecté partout et ne peut plus se connecter tant qu'un Admin ne l'a pas réintégré. Son Match en cours prend fin, et il sort de l'appariement et du Classement. Ses Publications, son avatar, ses Justificatifs, son XP et sa Série restent, et les Signalements le visant restent ouverts.",
        suspendAdminBody:
          "Cet Admin est déconnecté partout et ne peut plus se connecter tant qu'un autre Admin ne l'a pas réintégré. Son Match en cours prend fin. Ses Publications, son avatar, ses Justificatifs, son XP et sa Série restent, et les Signalements le visant restent ouverts.",
        reinstateTitle: 'Réintégrer {name} ?',
        reinstateBody:
          "Cet Étudiant peut se reconnecter et retrouve son rang au Classement. S'il indique une Compétence, le prochain Tour peut l'associer, et dans un Tour ouvert où il n'a aucun Match en vigueur, un Admin peut l'associer à la main dès maintenant. Rien de ce que la Suspension a arrêté ne revient : un Match arrêté le reste.",
        reinstateAdminBody: "Cet Admin peut se reconnecter. Rien de ce que la Suspension a arrêté ne revient : un Match arrêté le reste.",
        removeTitle: 'Exclure {name} ?',
        removeBody:
          "C'est définitif : personne ne peut l'annuler. Cet Étudiant est déconnecté partout et ne pourra plus jamais se connecter, et son e-mail ne pourra plus jamais être utilisé. Son Match en cours prend fin, son avatar est supprimé, et chaque Signalement ouvert le visant est clos comme traité, avec vous enregistré comme la personne qui l'a résolu. Tout ce qu'il a écrit reste, affiché sous le nom « {tombstone} ».",
        cancel: 'Annuler',
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
        "Les deux listes apparaissent sur son profil, et le prochain Tour s'appuie sur ces Compétences pour l'associer. Une Compétence ne peut figurer que dans une seule liste.",
      teachHeading: 'Compétences à enseigner',
      learnHeading: 'Compétences à apprendre',
      nothingToAdd: "Toutes les Compétences du catalogue figurent déjà dans l'une de ses listes.",
      onBothLists:
        "Une Compétence ne peut figurer que dans une seule liste. Retirez {skills} de l'une de ses listes pour enregistrer.",
      emptyNudge: "Les Tours apparient les Étudiants selon leurs Compétences, et cet Étudiant n'en a aucune.",
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
      confirmTitle: "Effacer cet Objectif d'apprentissage ?",
      confirmBody:
        "Sa Compétence et sa phrase sont supprimées. L'Étudiant peut définir un nouvel Objectif d'apprentissage à tout moment.",
    },
  },
} as const satisfies Catalogue<'fr', typeof admin>;
