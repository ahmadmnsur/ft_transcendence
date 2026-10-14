import type errors from '../en/errors';
import type { Catalogue } from '../types';

export default {
  validation_failed: 'Vérifiez les champs signalés.',
  not_found: 'Introuvable.',
  internal_error: 'Une erreur est survenue.',
} as const satisfies Catalogue<'fr', typeof errors>;
