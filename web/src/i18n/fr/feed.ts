import type en from '../en/feed';
import type { Catalogue } from '../types';

export default {
  title: 'Fil d’actualité',
  loading: 'Chargement des Publications…',
  emptyTitle: 'Aucune Publication pour le moment.',
  emptyDescription: 'Les Points clés publics et les réponses aux Sujets de réflexion apparaissent ici.',
  more: 'Charger plus de Publications',
  retry: 'Réessayer',
  post: {
    takeaway: 'Point clé public',
    answer: 'Réponse à {question}',
    like: 'J’aime',
    likeCount: { one: '{count} J’aime', many: '{count} J’aime', other: '{count} J’aime' },
  },
  likers: {
    title: 'Qui a aimé cette Publication',
    loading: 'Chargement des personnes qui ont aimé cette Publication…',
    empty: 'Personne n’a encore aimé cette Publication.',
    retry: 'Réessayer',
  },
  profile: {
    heading: 'Publications',
    empty: 'Aucune Publication pour le moment.',
  },
} as const satisfies Catalogue<'fr', typeof en>;
