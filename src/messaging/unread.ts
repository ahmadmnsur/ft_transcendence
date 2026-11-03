import type { Prisma } from '../generated/prisma/client';

export function unreadMessagesWhere(studentId: string): Prisma.DirectMessageWhereInput {
  return { recipientId: studentId, readAt: null };
}
