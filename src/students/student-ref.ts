import type { Prisma } from '../generated/prisma/client';
import type { Role } from '../shared/roles';

// §6.0.1: every place a person appears. Later tickets reuse this helper
// wherever a person appears.
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
  avatar: { select: { token: true } },
} as const satisfies Prisma.StudentSelect;

// §6.0.1: an avatar's URL is its file route, named by the row's token; a
// Student with no row shows the bundled default.
export function avatarUrlFor(avatar: { token: string } | null): string | null {
  return avatar === null ? null : `/api/files/avatars/${avatar.token}`;
}

export function toStudentRef(row: {
  id: string;
  displayName: string;
  role: Role;
  removedAt: Date | null;
  avatar: { token: string } | null;
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
    avatarUrl: avatarUrlFor(row.avatar),
    isAdmin: row.role === 'ADMIN',
    removed: false,
  };
}
