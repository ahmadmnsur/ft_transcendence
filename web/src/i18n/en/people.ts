import type { EnGroup } from '../types';

// A Removed Student's name, which the SPA shows in place of the API's
// English displayName.
export default { tombstone: 'Former student' } as const satisfies EnGroup;
