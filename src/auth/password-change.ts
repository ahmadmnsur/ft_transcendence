import { ApiError } from '../core/errors';
import { Injectable } from '@nestjs/common';
import { AppLogger, errorFields } from '../core/logger';
import { PrismaService } from '../core/prisma.service';
import { RealtimePublisher } from '../core/realtime-publisher';
import { SupabaseAuthClient, type PasswordCheckOutcome } from '../core/supabase-auth';
import { CheckpointHook, UnitOfWork, type PrismaTx } from '../core/uow';
import { movedPasswordVersion, tooManyAttempts, wrongPassword } from './refusals';
import { deleteEverySession } from './sign-out';

export type PasswordStep3 = (studentId: string, currentPassword: string) => Promise<void>;

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
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.gates.get(studentId) === gate) this.gates.delete(studentId);
    }
  }
}

export class PasswordUpdateFailed extends ApiError {
  constructor() {
    super('busy_retry_later');
  }
}

export class SignedOutFailure extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export function signedOutBy(err: unknown): boolean {
  return (
    err instanceof PasswordUpdateFailed ||
    err instanceof SignedOutFailure ||
    (err instanceof ApiError && err.code === 'unauthenticated')
  );
}

export type PasswordChangeInput = {
  studentId: string;
  newPassword: string;
  checkStep3: () => Promise<void>;
  recheckInStep4?: (tx: PrismaTx) => Promise<void>;
  sessionHash: string | null;
};

export async function changePasswordCore(
  input: PasswordChangeInput,
  deps: PasswordChangeDeps,
): Promise<void> {
  const { prisma } = deps;
  const { studentId } = input;
  const before = await prisma.student.findUnique({
    where: { id: studentId },
    select: { passwordVersion: true },
  });
  if (before === null) throw movedPasswordVersion();
  await input.checkStep3();
  return deps.lock.runExclusive(studentId, () =>
    changePasswordSteps(input, deps, before.passwordVersion),
  );
}

async function changePasswordSteps(
  input: PasswordChangeInput,
  deps: PasswordChangeDeps,
  expectedVersion: number,
): Promise<void> {
  const { supabase, uow, checkpoints, publisher, logger } = deps;
  const { studentId } = input;
  await uow.run('password-change:first-sign-out', async (tx, ctx) => {
    const current = await tx.student.findUnique({
      where: { id: studentId },
      select: { passwordVersion: true, suspendedAt: true, removedAt: true },
    });
    if (current === null || current.passwordVersion !== expectedVersion) {
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
    await input.recheckInStep4?.(tx);
    await ctx.checkpoint('password-change:first-sign-out');
    await tx.student.update({ where: { id: studentId }, data: { passwordVersion: { increment: 1 } } });
    await deleteEverySession(tx, ctx, publisher, studentId);
  });
  await checkpoints.reach('password-change:admin-update', 1);
  try {
    await supabase.adminUpdatePassword(studentId, input.newPassword);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'busy_retry_later') throw new PasswordUpdateFailed();
    throw new SignedOutFailure('The password change failed after signing out.', { cause: err });
  }
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
      await deleteEverySession(tx, ctx, publisher, studentId);
    });
  } catch (err) {
    logger.entry('error', { operation: 'password-change:second-sign-out', ...errorFields(err) });
  }
}
