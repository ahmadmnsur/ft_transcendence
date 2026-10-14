import { SESSION_TTL_SECONDS, maxAgeUntil, newSessionToken } from '../core/session-cookie';
import type { UnitOfWork } from '../core/uow';
import { accountRemoved, accountSuspended, movedPasswordVersion } from './refusals';

export type SessionCreateDeps = {
  uow: UnitOfWork;
};

// §5.1 sign-in, step 4, as its own function: create the session after
// Supabase accepted the password. The test harness's session helper calls it
// directly, with no real password check (§16.2). The transaction re-reads
// `password_version`, `removed_at` and `suspended_at`, in that order: a moved
// version → `password_incorrect`; Removed → `account_removed`; Suspended →
// `account_suspended`; otherwise it creates the Session and purges that
// Student's expired rows.
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
      // A lost race, not a wrong password: not counted toward the throttle.
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
