import type messages from '../en/messages';
import type { Catalogue } from '../types';

export default {
  title: 'Messages directs',
  list: {
    title: 'Vos Messages directs',
    subtitle: 'Vous seul voyez cette liste.',
    loading: 'Chargement de vos Messages directs…',
    emptyTitle: "Vous n'avez encore échangé aucun Message direct.",
    emptyDescription: "Vous pouvez en envoyer un depuis le profil d'un Étudiant.",
    showMore: 'Afficher plus',
    yourMessage: 'Vous\u00A0: {body}',
    unread: { one: '{count} non lu', many: '{count} non lus', other: '{count} non lus' },
  },
  page: {
    loading: 'Chargement des Messages directs…',
    heading: 'Messages directs avec {name}',
    emptyTitle: "Aucun Message direct avec {name} pour l'instant.",
    emptyDescription: 'Écrivez le premier ci-dessous.',
    composerLabel: 'Votre message',
    send: 'Envoyer',
    sending: 'Envoi…',
    showEarlier: 'Afficher les messages précédents',
    ownSender: 'Vous',
    empty: "Écrivez d'abord un message.",
    tooLong: 'Gardez le message dans la limite de {limit} caractères.',
    notConnected: 'Vous êtes hors ligne. Vérifiez votre connexion et réessayez.',
    mayHaveSaved: "Le message a peut-être été envoyé. Vérifiez les messages ci-dessus avant de l'envoyer à nouveau.",
  },
  profile: {
    messageLink: 'Envoyer un Message direct',
  },
} as const satisfies Catalogue<'fr', typeof messages>;
