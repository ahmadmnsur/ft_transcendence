import type auth from '../en/auth';
import type { Catalogue } from '../types';

export default {
  password: {
    hint: {
      text: '{minChars}, {maxBytes}. Aucune autre règle.',
      parts: {
        minChars: {
          one: 'Au moins {count} caractère',
          many: 'Au moins {count} de caractères',
          other: 'Au moins {count} caractères',
        },
        maxBytes: {
          one: 'au plus {count} octet',
          many: "au plus {count} d'octets",
          other: 'au plus {count} octets',
        },
      },
    },
    invalid: {
      text: 'Utilisez {minChars} et {maxBytes}.',
      parts: {
        minChars: {
          one: 'au moins {count} caractère',
          many: 'au moins {count} de caractères',
          other: 'au moins {count} caractères',
        },
        maxBytes: {
          one: 'au plus {count} octet',
          many: "au plus {count} d'octets",
          other: 'au plus {count} octets',
        },
      },
    },
  },
  signIn: {
    title: 'Se connecter',
    heading: 'Se connecter',
    emailLabel: 'E-mail',
    passwordLabel: 'Mot de passe',
    submit: 'Se connecter',
    submitting: 'Connexion…',
    emailInvalid: 'Saisissez une adresse e-mail valide.',
    passwordEmpty: 'Saisissez votre mot de passe.',
    noAccount: 'Pas encore de compte\u202f? {link}',
    signUpLink: "S'inscrire",
    noticePasswordChanged: 'Votre mot de passe a été modifié. Connectez-vous avec votre nouveau mot de passe.',
    noticeSignedOutUnknown:
      "Vous avez été déconnecté, et la modification du mot de passe n'est peut-être pas terminée. Essayez d'abord votre nouveau mot de passe, puis l'ancien.",
  },
  signUp: {
    title: "S'inscrire",
    heading: 'Créer votre compte',
    emailLabel: 'E-mail',
    emailHint: 'Utilisé uniquement pour vous connecter. Jamais visible par les autres Étudiants.',
    emailInvalid: 'Saisissez une adresse e-mail valide.',
    displayNameLabel: "Nom d'affichage",
    displayNameHint: {
      one: '{minChars}–{count} caractère. Visible par tous les Étudiants connectés.',
      many: '{minChars}–{count} de caractères. Visible par tous les Étudiants connectés.',
      other: '{minChars}–{count} caractères. Visible par tous les Étudiants connectés.',
    },
    displayNameInvalid: {
      one: "Saisissez un nom d'affichage de {minChars}–{count} caractère.",
      many: "Saisissez un nom d'affichage de {minChars}–{count} de caractères.",
      other: "Saisissez un nom d'affichage de {minChars}–{count} caractères.",
    },
    passwordLabel: 'Mot de passe',
    acceptTermsLabel: "J'accepte les Conditions d'utilisation et j'ai lu la Politique de confidentialité",
    readFullText: 'Lire le texte complet\u00a0: {termsLink} · {privacyLink}',
    termsLink: "Conditions d'utilisation",
    privacyLink: 'Politique de confidentialité',
    acceptTermsInvalid: 'Vous devez accepter les Conditions et lire la Politique pour vous inscrire.',
    submit: "S'inscrire",
    submitting: 'Inscription…',
    haveAccount: 'Vous avez déjà un compte\u202f? {link}',
    signInLink: 'Se connecter',
  },
  passwordChange: {
    title: 'Mon profil',
    heading: 'Mon profil',
    cardTitle: 'Changer le mot de passe',
    cardSubtitle: 'Changer votre mot de passe vous déconnecte partout.',
    currentLabel: 'Mot de passe actuel',
    currentEmpty: 'Saisissez votre mot de passe actuel.',
    newLabel: 'Nouveau mot de passe',
    confirmLabel: 'Confirmez le nouveau mot de passe',
    confirmInvalid: 'Les deux nouveaux mots de passe ne correspondent pas.',
    submit: 'Changer le mot de passe',
    submitting: 'Modification…',
  },
} as const satisfies Catalogue<'fr', typeof auth>;
