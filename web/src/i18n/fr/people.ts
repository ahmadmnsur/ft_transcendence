import type people from '../en/people';
import type { Catalogue } from '../types';

export default { tombstone: 'Ancien étudiant' } as const satisfies Catalogue<'fr', typeof people>;
