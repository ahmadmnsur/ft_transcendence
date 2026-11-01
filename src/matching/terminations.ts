import type { PrismaTx } from '../core/uow';
import { IN_PROGRESS_STATUSES } from '../shared/matches';


export async function readInProgressMatchIds(tx: PrismaTx, studentId: string): Promise<string[]> {
  const rows = await tx.match.findMany({
    where: { status: { in: [...IN_PROGRESS_STATUSES] }, OR: [{ mentorId: studentId }, { menteeId: studentId }] },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function terminateMatches(tx: PrismaTx, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await tx.match.updateMany({
    where: { id: { in: [...ids] }, status: { in: [...IN_PROGRESS_STATUSES] } },
    data: { status: 'TERMINATED_BY_ADMIN' },
  });
}
