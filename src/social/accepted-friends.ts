import type { Prisma } from '../generated/prisma/client';

// §7.6, §11.1: the Students who are a Student's accepted Friends, in either
// direction, Removed excluded. One rule for the Friends list and for the
// Presence audience, so the two never disagree about who is told.
export function acceptedFriendsOf(studentId: string): Prisma.StudentWhereInput {
  return {
    removedAt: null,
    OR: [
      { friendRequestsSent: { some: { addresseeId: studentId, status: 'ACCEPTED' } } },
      { friendRequestsReceived: { some: { requesterId: studentId, status: 'ACCEPTED' } } },
    ],
  };
}
