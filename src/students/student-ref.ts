import type { Prisma } from '../generated/prisma/client';
import type { Role } from '../shared/roles';

export type StudentRef = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  removed: boolean;
};

export const STUDENT_REF_SELECT = {
  id: true,
  displayName: true,
  role: true,
  removedAt: true,
  avatar: { select: { token: true } },
} as const satisfies Prisma.StudentSelect;

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
  if (row.removedAt !== null) {
    return {
      id: row.id,
      displayName: 'Former student',
      avatarUrl: null,
      isAdmin: false,
      removed: true,
    };
  }
  return {
    id: row.id,
    displayName: row.displayName,
    avatarUrl: avatarUrlFor(row.avatar),
    isAdmin: row.role === 'ADMIN',
    removed: false,
  };
}
