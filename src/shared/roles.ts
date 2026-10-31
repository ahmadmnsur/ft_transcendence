export const ROLES = ['STUDENT', 'PEER_MODERATOR', 'ADMIN'] as const;

export type Role = (typeof ROLES)[number];
