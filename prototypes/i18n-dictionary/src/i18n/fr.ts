import type en from './en';
import type { Catalogue, NoExtra } from './types';

const fr = {
  nav: { privacy: 'Politique de confidentialité', terms: "Conditions d'utilisation" },
  inbox: {
    title: 'Boîte de réception',
    unread: { one: '{count} message non lu', many: '{count} de messages non lus', other: '{count} messages non lus' },
    sentYou: '{name} vous a envoyé un message',
  },
  errors: {
    validation_failed: 'Vérifiez les champs signalés.',
    not_found: 'Introuvable.',
    internal_error: 'Une erreur est survenue.',
  },
  insights: {
    gapSome: {
      text: '{demand} apprendre {skill} ; {supply}.',
      parts: {
        demand: { one: '{count} étudiant veut', many: '{count} d’étudiants veulent', other: '{count} étudiants veulent' },
        supply: { one: 'seulement {count} peut l’enseigner', many: 'seulement {count} peuvent l’enseigner', other: 'seulement {count} peuvent l’enseigner' },
      },
    },
  },
} as const satisfies Catalogue<'fr', typeof en>;

export const frChecked: NoExtra<typeof fr, typeof en> = true;
export default fr;
