import type legal from '../en/legal';
import type { Catalogue } from '../types';

export default {
  untitledTable: 'Tableau',
  privacyTitle: 'Politique de confidentialité',
  termsTitle: "Conditions d'utilisation",
} as const satisfies Catalogue<'fr', typeof legal>;
