import type { Prisma } from '../generated/prisma/client';

export function feedbackReceivedWhere(studentId: string, matchId?: string): Prisma.PrivateFeedbackWhereInput {
  return { review: { match: { mentorId: studentId, ...(matchId === undefined ? {} : { id: matchId }) } } };
}
