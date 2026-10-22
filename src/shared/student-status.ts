// §4.3.1: a Student's status, derived from the two sanction flags: removedAt
// → REMOVED, else suspendedAt → SUSPENDED, else ACTIVE. The mirror both ends
// share, like the roles.
export const STUDENT_STATUSES = ['ACTIVE', 'SUSPENDED', 'REMOVED'] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number];
