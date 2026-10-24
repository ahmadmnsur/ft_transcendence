import type { PrismaTx, TxContext } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import type { ResolvedState } from '../shared/reports';
import type { Resolution } from './views';

// §12.3, §12.5: a group's reads and its one resolution write, as `tx` helpers
// the two group resolutions and Remove Student (§12.7) run inside their own
// transaction, since moderation owns `Report` (§3.4).

// §12.3: the group's OPEN rows at this transaction's serialization point.
export function openRows(tx: PrismaTx, target: Prisma.ReportWhereInput): Promise<Array<{ id: string; reporterId: string }>> {
  return tx.report.findMany({ where: { ...target, state: 'OPEN' }, select: { id: true, reporterId: true } });
}

// §12.5: every row of the group gets one state, one resolver and one time.
export async function closeGroup(
  tx: PrismaTx,
  ctx: TxContext,
  resolverId: string,
  rows: ReadonlyArray<{ id: string }>,
  state: ResolvedState,
): Promise<Resolution> {
  const { count } = await tx.report.updateMany({
    where: { id: { in: rows.map((row) => row.id) }, state: 'OPEN' },
    data: { state, resolvedById: resolverId, resolvedAt: ctx.now },
  });
  return { state, count };
}
