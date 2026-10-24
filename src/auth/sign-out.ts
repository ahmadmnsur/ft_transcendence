import type { RealtimePublisher } from '../core/realtime-publisher';
import type { PrismaTx, TxContext } from '../core/uow';

// §5.8's sign-out everywhere, as a `tx` helper: each of a password change's
// two sign-outs (§5.1) and the Suspension and Removal transactions (§12.7)
// delete every Session of the Student, and after commit `revokeSessions`
// drops every socket they hold through the port (§3.7).
export async function deleteEverySession(
  tx: PrismaTx,
  ctx: TxContext,
  publisher: RealtimePublisher,
  studentId: string,
): Promise<void> {
  await tx.session.deleteMany({ where: { studentId } });
  ctx.afterCommit(() => publisher.revokeSessions({ studentId }));
}
