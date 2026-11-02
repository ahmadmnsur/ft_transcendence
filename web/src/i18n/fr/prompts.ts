import type en from '../en/prompts';
import type { Catalogue } from '../types';

export default {
  title: 'Sujets de réflexion', adminTitle: 'Publier un Sujet de réflexion', live: 'Ouvert', closed: 'Fermé',
  history: 'Historique des Sujets', noPrompts: 'Aucun Sujet de réflexion n’a été publié.', loading: 'Chargement des Sujets de réflexion…',
  answers: 'Réponses',
  answerCount: { one: '{count} réponse', many: '{count} réponses', other: '{count} réponses' },
  noAnswers: 'Aucune réponse pour le moment.',
  answerPages: 'Pages des réponses',
  question: 'Question de réflexion', publish: 'Publier', publishing: 'Publication…', published: 'Votre Sujet de réflexion est publié.',
  publishHint: 'La publication ferme le Sujet précédent. Les questions et les réponses ne peuvent être ni modifiées ni supprimées.',
  textLimit: { one: '{min}–{count} caractère.', many: '{min}–{count} de caractères.', other: '{min}–{count} caractères.' },
  textEmpty: { one: 'Saisissez {min}–{count} caractère.', many: 'Saisissez {min}–{count} de caractères.', other: 'Saisissez {min}–{count} caractères.' },
  textInvalid: {
    one: 'Saisissez {min}–{count} caractère. Retirez les caractères de contrôle non autorisés.',
    many: 'Saisissez {min}–{count} de caractères. Retirez les caractères de contrôle non autorisés.',
    other: 'Saisissez {min}–{count} caractères. Retirez les caractères de contrôle non autorisés.',
  },
  confirmTitle: 'Publier ce Sujet de réflexion ?', cancel: 'Annuler',
  answerLabel: 'Votre réponse', answerHint: 'Votre réponse est immédiatement visible par chaque Étudiant connecté. Vous pouvez répondre une seule fois, sans modification ni suppression possible.',
  submit: 'Publier la réponse', submitting: 'Publication de la réponse…', answered: 'Vous avez répondu à ce Sujet de réflexion.',
  saved: 'Votre réponse est publiée.', retry: 'Réessayer', back: 'Tous les Sujets de réflexion',
} as const satisfies Catalogue<'fr', typeof en>;
