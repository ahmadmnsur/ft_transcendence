import type social from '../en/social';
import type { Catalogue } from '../types';

export default {
  friends: {
    title: 'Amis',
  },
  actions: {
    block: 'Bloquer',
    blocking: 'Blocage…',
    unblock: 'Débloquer',
    unblocking: 'Déblocage…',
    cancel: 'Annuler',
    retry: 'Réessayer',
    blocked: 'Vous avez bloqué {name}.',
    unblocked: "Vous avez débloqué {name}. Si vous étiez Amis avant le Blocage, il faudra envoyer une nouvelle demande d'ami.",
    unblockedRemoved: 'Vous avez débloqué {name}.',
  },
  profile: {
    blockedNote: 'Vous avez bloqué cet Étudiant.',
    confirmTitle: 'Bloquer {name} ?',
    confirmBody:
      "Aucun de vous deux ne pourra envoyer à l'autre une demande d'ami ni un Message direct, et vous ne formerez pas de Match ensemble. Si vous êtes Amis, ou si une demande d'ami est en attente, cela prend fin aussi. Un Match déjà en cours reste. {name} n'en est pas informé.",
    confirm: 'Bloquer',
  },
  blocks: {
    title: 'Blocages',
    subtitle: "Cette liste n'est visible que par vous. Un Étudiant que vous bloquez n'en est pas informé.",
    loading: 'Chargement de vos Blocages…',
    emptyTitle: "Vous n'avez bloqué personne.",
    emptyDescription: 'Vous pouvez bloquer un Étudiant depuis son profil.',
    blockedOn: 'Bloqué le {date}',
    unblockNamed: 'Débloquer {name}',
  },
} as const satisfies Catalogue<'fr', typeof social>;
