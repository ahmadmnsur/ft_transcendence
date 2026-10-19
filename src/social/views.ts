import type { StudentRef } from '../students/student-ref';

// §6.4's wire shapes, exact field names: the SPA depends on them.

// One of the actor's own Blocks: the blocked Student and when the Block was
// set. A Removed Student shows as the tombstone (§6.0.1), so a Block set
// before a Removal can still be lifted.
export type BlockView = { student: StudentRef; createdAt: string };
