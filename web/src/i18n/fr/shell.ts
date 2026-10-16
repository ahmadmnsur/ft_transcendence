import type shell from '../en/shell';
import type { Catalogue } from '../types';

export default {
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
} as const satisfies Catalogue<'fr', typeof shell>;
