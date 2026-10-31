import { SESSION_TTL_SECONDS, maxAgeUntil, newSessionToken } from '../core/session-cookie';
import type { UnitOfWork } from '../core/uow';
import { accountRemoved, accountSuspended, movedPasswordVersion } from './refusals';

export type SessionCreateDeps = {
  uow: UnitOfWork;
};

export async function createSessionAfterPasswordCheck(
  input: { studentId: string; expectedPasswordVersion: number },
  deps: SessionCreateDeps,
): Promise<{ token: string; expiresAt: Date; maxAge: number }> {
  return deps.uow.run('sign-in', async (tx, ctx) => {
    const student = await tx.student.findUnique({
      where: { id: input.studentId },
      select: { passwordVersion: true, removedAt: true, suspendedAt: true },
    });
    if (student === null || student.passwordVersion !== input.expectedPasswordVersion) {
      throw movedPasswordVersion();
    }
    if (student.removedAt !== null) throw accountRemoved();
    if (student.suspendedAt !== null) throw accountSuspended();
    await ctx.checkpoint('sign-in');
    const expiresAt = new Date(ctx.now.getTime() + SESSION_TTL_SECONDS * 1000);
    const session = newSessionToken();
    await tx.session.create({ data: { id: session.id, studentId: input.studentId, expiresAt } });
    await tx.session.deleteMany({ where: { studentId: input.studentId, expiresAt: { lte: ctx.now } } });
    return { token: session.token, expiresAt, maxAge: maxAgeUntil(expiresAt, ctx.now) };
  });
}
