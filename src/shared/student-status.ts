export const STUDENT_STATUSES = ['ACTIVE', 'SUSPENDED', 'REMOVED'] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number];
