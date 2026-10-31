import type { Prisma } from '../generated/prisma/client';

export function acceptedFriendsOf(studentId: string): Prisma.StudentWhereInput {
  return {
    removedAt: null,
    OR: [
      { friendRequestsSent: { some: { addresseeId: studentId, status: 'ACCEPTED' } } },
      { friendRequestsReceived: { some: { requesterId: studentId, status: 'ACCEPTED' } } },
    ],
  };
}
