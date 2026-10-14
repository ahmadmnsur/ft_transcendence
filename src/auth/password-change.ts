import { ApiError } from '../core/errors';
import { Injectable } from '@nestjs/common';
import { AppLogger, errorFields } from '../core/logger';
import { PrismaService } from '../core/prisma.service';
import { RealtimePublisher } from '../core/realtime-publisher';
import { SupabaseAuthClient, type PasswordCheckOutcome } from '../core/supabase-auth';
import { CheckpointHook, UnitOfWork } from '../core/uow';
import { movedPasswordVersion, tooManyAttempts, wrongPassword } from './refusals';

// §5.1's step 3, as a parameter: check the current password, or throw. The
// password change passes the Supabase check; #157 passes Confirm with 42.
export type PasswordStep3 = (studentId: string, currentPassword: string) => Promise<void>;

// The shared password check (§5.1): the grant on the Student's login. Refused
// → `password_incorrect`, counted; a Supabase 429 → `too_many_attempts`, not
// counted; unreachable → `busy_retry_later`. Sign-in, the password change's
// step 3 (and later Connect/Disconnect 42) all use it.
export function passwordStep3(supabase: SupabaseAuthClient): PasswordStep3 {
  return async (studentId: string, currentPassword: string): Promise<void> => {
    const outcome: PasswordCheckOutcome = await supabase.checkPassword(studentId, currentPassword);
    if (outcome === 'accepted') return;
    if (outcome === 'refused') throw wrongPassword();
    if (outcome === 'rate-limited') throw tooManyAttempts();
    throw new ApiError('busy_retry_later');
  };
}

export type PasswordChangeDeps = {
  prisma: PrismaService;
  supabase: SupabaseAuthClient;
  uow: UnitOfWork;
  checkpoints: CheckpointHook;
  publisher: RealtimePublisher;
  logger: AppLogger;
  lock: PasswordChangeLock;
};

// Serializes password changes per Student across steps 2–6. The version
// check cannot catch two overlapping changes: B can read the version after A
// moved it and still check the old password before A's Supabase update, so
// both would go through and the last writer would win. The lock is a promise
// chain keyed by `studentId`, held for the whole shared function, so #157's
// path through it is covered too. It is in memory because there is one `api`
// process (§15.1), like the throttle (§5.5).
@Injectable()
export class PasswordChangeLock {
  private readonly gates = new Map<string, Promise<void>>();

  async runExclusive<T>(studentId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.gates.get(studentId);
    let release!: () => void;
    const gate: Promise<void> = new Promise((resolve) => {
      release = resolve;
    });
    this.gates.set(studentId, gate);
    // A gate only ever resolves, so waiting cannot fail: a holder ahead that
    // threw still passes the turn.
    await previous;
    try {
      return await work();
    } finally {
      release();
      // Remove only when idle: a holder chained behind us replaced the entry
      // with its own gate.
      if (this.gates.get(studentId) === gate) this.gates.delete(studentId);
    }
  }
}

// Step 5 failed without an answer from Supabase after step 4 committed:
// the Student is already signed out and the password unchanged. Answered
// `busy_retry_later`, and the boundary clears the cookie for it, but not for
// a step-3 failure (§5.1, §6.1).
export class PasswordUpdateFailed extends ApiError {
  constructor() {
    super('busy_retry_later');
  }
}

// Step 5 failed with a definitive refusal after step 4 committed: the
// Student is already signed out and the password unchanged. Answered
// `internal_error`, and the boundary clears the cookie for it.
export class SignedOutFailure extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

// §5.1's password change, steps 2 and 4–6, as one function: step 1
// (validation, throttle) already ran at the boundary, and step 3 arrives as
// a parameter. Each sign-out raises `password_version` and deletes every
// session of the Student, the current one included, and queues
// `revokeSessions(studentId)` after commit.
export async function changePasswordCore(
  input: {
    studentId: string;
    currentPassword: string;
    newPassword: string;
    checkCurrentPassword: PasswordStep3;
    // The actor's session, or null for an actor the seed or a test
    // constructs, which skips the check. A change running on a session a
    // previous change already deleted is refused in step 4 (§3.4). #157's
    // path passes its own actor's `sessionHash` the same way.
    sessionHash: string | null;
  },
  deps: PasswordChangeDeps,
): Promise<void> {
  // The whole function runs under the per-Student lock, so two concurrent
  // changes serialize: the second reads the first's final version and its
  // check of the old password is refused.
  return deps.lock.runExclusive(input.studentId, () => changePasswordSteps(input, deps));
}

async function changePasswordSteps(
  input: {
    studentId: string;
    currentPassword: string;
    newPassword: string;
    checkCurrentPassword: PasswordStep3;
    sessionHash: string | null;
  },
  deps: PasswordChangeDeps,
): Promise<void> {
  const { prisma, supabase, uow, checkpoints, publisher, logger } = deps;
  const { studentId } = input;
  // Step 2: read `password_version`.
  const before = await prisma.student.findUnique({
    where: { id: studentId },
    select: { passwordVersion: true },
  });
  if (before === null) throw movedPasswordVersion();
  // Step 3: the password check.
  await input.checkCurrentPassword(studentId, input.currentPassword);
  // Step 4: version + 1, every session deleted. The sanction flags are
  // re-read with the version (§3.4): Suspended or Removed refuses with
  // `unauthenticated`, nothing written and no Supabase update (§4.3.1: a
  // Removed row accepts no update). The actor's own session is re-read too:
  // a change running on a session a previous change already deleted is
  // refused the same way, before the checkpoint (§3.4, §5.8).
  await uow.run('password-change:first-sign-out', async (tx, ctx) => {
    const current = await tx.student.findUnique({
      where: { id: studentId },
      select: { passwordVersion: true, suspendedAt: true, removedAt: true },
    });
    if (current === null || current.passwordVersion !== before.passwordVersion) {
      throw movedPasswordVersion();
    }
    if (current.suspendedAt !== null || current.removedAt !== null) {
      throw new ApiError('unauthenticated');
    }
    if (input.sessionHash !== null) {
      const session = await tx.session.findUnique({
        where: { id: input.sessionHash },
        select: { id: true },
      });
      if (session === null) throw new ApiError('unauthenticated');
    }
    await ctx.checkpoint('password-change:first-sign-out');
    await tx.student.update({ where: { id: studentId }, data: { passwordVersion: { increment: 1 } } });
    await tx.session.deleteMany({ where: { studentId } });
    ctx.afterCommit(() => publisher.revokeSessions({ studentId }));
  });
  // From here on the Student is signed out, so a step-5 failure clears the
  // cookie at the boundary; a step-6 failure is logged and answered as
  // success below.
  // The named pause between step 4 and step 5 (§3.6.4): a no-op in
  // production, a barrier in tests.
  await checkpoints.reach('password-change:admin-update', 1);
  // Step 5: Supabase admin update sets the new password.
  try {
    await supabase.adminUpdatePassword(studentId, input.newPassword);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'busy_retry_later') throw new PasswordUpdateFailed();
    throw new SignedOutFailure('The password change failed after signing out.', { cause: err });
  }
  // Step 6: version + 1, every session deleted again. Catches a sign-in with
  // the old password that landed between steps 4 and 5, while the old
  // password still worked at Supabase (§5.1). A row Removed by then is never
  // updated again; its sessions are still deleted.
  //
  // A step-6 failure leaves what §5.1 accepts: the new password set and at
  // most a session created in the gap. It is logged and answered as success,
  // with the cookie cleared as on any success — answering a failure would
  // tell the Student the password was not changed, which is false.
  try {
    await uow.run('password-change:second-sign-out', async (tx, ctx) => {
      const current = await tx.student.findUnique({
        where: { id: studentId },
        select: { removedAt: true },
      });
      await ctx.checkpoint('password-change:second-sign-out');
      if (current !== null && current.removedAt === null) {
        await tx.student.update({ where: { id: studentId }, data: { passwordVersion: { increment: 1 } } });
      }
      await tx.session.deleteMany({ where: { studentId } });
      ctx.afterCommit(() => publisher.revokeSessions({ studentId }));
    });
  } catch (err) {
    logger.entry('error', { operation: 'password-change:second-sign-out', ...errorFields(err) });
  }
}
