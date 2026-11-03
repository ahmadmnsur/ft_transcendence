import type { ReportReason } from '@shared/reports';
import type en from '../en/reports';
import type { Catalogue } from '../types';

const reasons = {
  HARASSMENT: 'Harcèlement',
  SPAM: 'Spam',
  INAPPROPRIATE_CONTENT: 'Contenu inapproprié',
  OTHER: 'Autre',
} as const satisfies Record<ReportReason, string>;

export default {
  reasons,
  report: 'Signaler',
  postTitle: 'Signaler une Publication de {name}',
  studentTitle: 'Signaler {name}',
  reason: 'Motif',
  chooseReason: 'Choisissez un motif',
  reasonRequired: 'Choisissez un motif.',
  textLabel: 'Précisions (facultatif)',
  textHint: "Jusqu'à {limit} caractères. Un Signalement ne peut être ni modifié ni retiré.",
  textTooLong: 'Gardez les précisions dans la limite de {limit} caractères.',
  textInvalid: 'Retirez les tabulations et autres caractères invisibles des précisions.',
  postNotice: "Les Modérateurs étudiants et les Admins examinent les Publications signalées. Les Admins voient qui a déposé un Signalement ; les Modérateurs étudiants, non, et l'auteur de la Publication n'en est pas informé.",
  studentNotice: "Les Admins examinent les Signalements visant un Étudiant et voient qui les a déposés. {name} n'en est pas informé.",
  submit: 'Envoyer le Signalement',
  submitting: 'Envoi…',
  cancel: 'Annuler',
  close: 'Fermer',
  received: 'Votre Signalement a été reçu.',
} as const satisfies Catalogue<'fr', typeof en>;
