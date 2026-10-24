import type { PrismaTx } from '../core/uow';
import { IN_PROGRESS_STATUSES } from '../shared/matches';

// §8.8's administrative termination, as `tx` helpers a Suspension and a
// Removal run inside their own transaction (§12.7). The sanction reads the
// target's in-progress Matches before its checkpoint, so a Review, a Decline,
// a close or a hand-made creation touching them has one serial order with it
// (§3.6.3).

// The ids of every `MATCHED` or `ACCEPTED` Match the Student is in, either
// side.
export async function readInProgressMatchIds(tx: PrismaTx, studentId: string): Promise<string[]> {
  const rows = await tx.match.findMany({
    where: { status: { in: [...IN_PROGRESS_STATUSES] }, OR: [{ mentorId: studentId }, { menteeId: studentId }] },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

// Those Matches become `TERMINATED_BY_ADMIN`. `declined_by_id` stays null: a
// sanction is not a decline, by either Student (ADR-0008 d5). The other
// Student is unmatched again only if still a candidate (§8.9); nothing looks
// for a replacement.
export async function terminateMatches(tx: PrismaTx, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await tx.match.updateMany({
    where: { id: { in: [...ids] }, status: { in: [...IN_PROGRESS_STATUSES] } },
    data: { status: 'TERMINATED_BY_ADMIN' },
  });
}
