import type { RealtimePublisher } from '../core/realtime-publisher';
import type { PrismaTx, TxContext } from '../core/uow';

export async function deleteEverySession(
  tx: PrismaTx,
  ctx: TxContext,
  publisher: RealtimePublisher,
  studentId: string,
): Promise<void> {
  await tx.session.deleteMany({ where: { studentId } });
  ctx.afterCommit(() => publisher.revokeSessions({ studentId }));
}
