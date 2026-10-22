import type en from '../en/leaderboard';
import type { Catalogue } from '../types';

export default {
  title: 'Classement',
  description: 'Le total des XP des Matchs terminés et des réponses aux Sujets de réflexion. Seuls les Étudiants et les Modérateurs étudiants actifs sont classés.',
  caption: 'Les dix premiers par XP, avec votre position en dessous si vous êtes au-delà des dix premiers',
  rank: 'Rang',
  student: 'Étudiant',
  xp: 'XP',
  level: 'Niveau',
  yourPosition: 'Votre position',
  loading: 'Chargement du Classement…',
  retry: 'Réessayer',
  emptyTitle: 'Aucun Étudiant à classer pour le moment',
  emptyDescription: 'Le Classement apparaîtra dès qu’un Étudiant actif rejoindra la plateforme.',
} as const satisfies Catalogue<'fr', typeof en>;
