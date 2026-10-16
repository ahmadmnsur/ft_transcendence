import type { Prisma } from '../generated/prisma/client';
import type { Role } from '../shared/roles';

// §6.0.1: every place a person appears. `avatarUrl` is always null for now:
// there is no Avatar table yet, so no row names a file. Later tickets reuse
// this helper wherever a person appears.
export type StudentRef = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  removed: boolean;
};

// The fields `toStudentRef` reads. `email` is never among them: §4.6 keeps
// email off every profile.
export const STUDENT_REF_SELECT = {
  id: true,
  displayName: true,
  role: true,
  removedAt: true,
} as const satisfies Prisma.StudentSelect;

export function toStudentRef(row: {
  id: string;
  displayName: string;
  role: Role;
  removedAt: Date | null;
}): StudentRef {
  // §6.0.1: a Removed Student is exactly this tombstone.
  if (row.removedAt !== null) {
    return {
      id: row.id,
      displayName: 'Former student',
      avatarUrl: null,
      isAdmin: false,
      removed: true,
    };
  }
  // `isAdmin` is true only for role ADMIN; a Peer Moderator is never marked.
  return {
    id: row.id,
    displayName: row.displayName,
    avatarUrl: null,
    isAdmin: row.role === 'ADMIN',
    removed: false,
  };
}
