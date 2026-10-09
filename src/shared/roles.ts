// §4.2: the Role mirror both ends share. One role per Student.
export const ROLES = ['STUDENT', 'PEER_MODERATOR', 'ADMIN'] as const;

export type Role = (typeof ROLES)[number];
