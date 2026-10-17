import type people from '../en/people';
import type { Catalogue } from '../types';

export default { tombstone: 'طالب سابق' } as const satisfies Catalogue<'ar', typeof people>;
