import type { PrismaTx, TxContext } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import type { ResolvedState } from '../shared/reports';
import type { Resolution } from './views';


export function openRows(tx: PrismaTx, target: Prisma.ReportWhereInput): Promise<Array<{ id: string; reporterId: string }>> {
  return tx.report.findMany({ where: { ...target, state: 'OPEN' }, select: { id: true, reporterId: true } });
}

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
