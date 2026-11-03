import type { Prisma } from '../generated/prisma/client';
import { STANDING_STATUSES } from '../shared/matches';

export function currentMatchWhere(studentId: string): Prisma.MatchWhereInput {
  return {
    round: { closedAt: null },
    status: { in: [...STANDING_STATUSES] },
    OR: [{ mentorId: studentId }, { menteeId: studentId }],
  };
}

export const MATCH_WAITING_SELECT = {
  status: true, mentorId: true, menteeId: true, createdAt: true,
  mentorAcceptedAt: true, menteeAcceptedAt: true, review: { select: { id: true } },
} as const satisfies Prisma.MatchSelect;

export type WaitingMatch = Prisma.MatchGetPayload<{ select: typeof MATCH_WAITING_SELECT }>;

export function matchWaitingAt(match: WaitingMatch | null, studentId: string): Date | null {
  if (match === null) return null;
  const mine = match.mentorId === studentId ? match.mentorAcceptedAt : match.menteeAcceptedAt;
  if (match.status === 'MATCHED' && mine === null) return match.createdAt;
  if (match.status === 'ACCEPTED' && match.menteeId === studentId && match.review === null) {
    const times = [match.mentorAcceptedAt, match.menteeAcceptedAt].filter((time) => time !== null);
    return times.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  }
  return null;
}
