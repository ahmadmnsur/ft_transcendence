import type shell from '../en/shell';
import type { Catalogue } from '../types';

export default {
  skipLink: 'Aller au contenu principal',
  pageTitle: '{page} · {brand}',
  header: {
    navLabel: 'Compte',
    profileLink: 'Mon profil',
    signOut: 'Se déconnecter',
    signingOut: 'Déconnexion…',
    signOutFailed: 'La déconnexion a échoué. Réessayez.',
    signInLink: 'Se connecter',
    signUpLink: "S'inscrire",
  },
  language: { label: 'Langue' },
  footer: { privacy: 'Politique de confidentialité', terms: "Conditions d'utilisation" },
  notFound: {
    name: 'Page introuvable',
    title: "Cette page n'existe pas.",
    description: "Vérifiez que l'adresse est correcte, ou revenez à l'accueil.",
    homeLink: "Retour à l'accueil",
  },
  error: {
    name: "Une erreur s'est produite",
    title: "Cette page n'a pas pu être affichée.",
    description: 'Réessayez dans un instant.',
    retry: 'Réessayer',
  },
} as const satisfies Catalogue<'fr', typeof shell>;
