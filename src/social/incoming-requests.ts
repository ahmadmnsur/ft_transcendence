import type { Prisma } from '../generated/prisma/client';

export function incomingRequestsWhere(studentId: string): Prisma.FriendshipWhereInput {
  return { addresseeId: studentId, status: 'PENDING', requester: { removedAt: null } };
}
