import type nav from '../en/nav';
import type { Catalogue } from '../types';

export default {
  privacy: 'Politique de confidentialité',
  terms: "Conditions d'utilisation",
} as const satisfies Catalogue<'fr', typeof nav>;
