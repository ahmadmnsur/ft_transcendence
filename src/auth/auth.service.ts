import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { AppLogger } from '../core/logger';
import { PrismaService } from '../core/prisma.service';
import { RealtimePublisher } from '../core/realtime-publisher';
import { parseSessionCookie } from '../core/session-cookie';
import { SessionResolver, type ActiveSession } from '../core/session-resolver';
import { SupabaseAuthClient } from '../core/supabase-auth';
import { CheckpointHook, UnitOfWork } from '../core/uow';
import {
  createAccountWithSession,
  toStudentView,
  type AccountExtraFields,
  type StudentView,
} from './account-create';
import { changePasswordCore, passwordStep3, PasswordChangeLock } from './password-change';
import { noAccount } from './refusals';
import { createSessionAfterPasswordCheck } from './session-create';

// §3.4: every method that acts for a signed-in Student takes an Actor. The
// operations that establish one — signup, login — read the Student row they
// act on themselves. Every write runs through the Unit of Work; no network
// call inside `work` (§3.6.2).
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseAuthClient,
    private readonly uow: UnitOfWork,
    private readonly checkpoints: CheckpointHook,
    private readonly publisher: RealtimePublisher,
    private readonly sessions: SessionResolver,
    private readonly logger: AppLogger,
    private readonly passwordLock: PasswordChangeLock,
  ) {}

  // Whether the request carries a valid session. Used for `already_signed_in`
  // on the public sign-up and login routes (§6.1). A sanctioned or expired
  // session is not a valid one: the request proceeds as signed out.
  async activeSession(cookieHeader: string | undefined): Promise<ActiveSession | null> {
    const parsed = parseSessionCookie(cookieHeader);
    if (parsed.kind !== 'session') return null;
    return this.sessions.resolveActive(parsed.token);
  }

  // §5.1 sign-up. Validation, the throttle and `already_signed_in` already
  // ran at the boundary; steps 2–5 are the shared function.
  async signup(input: {
    email: string;
    password: string;
    displayName: string;
    extra?: AccountExtraFields;
  }): Promise<{ student: StudentView; token: string; maxAge: number }> {
    const created = await createAccountWithSession(input, {
      prisma: this.prisma,
      supabase: this.supabase,
      uow: this.uow,
    });
    return { student: created.student, token: created.token, maxAge: created.maxAge };
  }

  // §5.1 sign-in. Step 2 reads the Student and its `password_version`; step 3
  // is the shared password check; step 4 is the shared session function.
  async login(input: { email: string; password: string }): Promise<{
    student: StudentView;
    token: string;
    maxAge: number;
  }> {
    const student = await this.prisma.student.findUnique({
      where: { email: input.email },
      select: { id: true, passwordVersion: true, displayName: true, email: true, role: true },
    });
    if (student === null) throw noAccount();
    await passwordStep3(this.supabase)(student.id, input.password);
    const session = await createSessionAfterPasswordCheck(
      { studentId: student.id, expectedPasswordVersion: student.passwordVersion },
      { uow: this.uow },
    );
    return { student: toStudentView(student), token: session.token, maxAge: session.maxAge };
  }

  // §5.8: deletes that one row. The guard already refused a gone session with
  // `unauthenticated`; a row lost since is a no-op. Writes nothing to
  // Supabase Auth.
  async logout(actor: Actor): Promise<void> {
    if (actor.sessionHash === null) return;
    const sessionHash = actor.sessionHash;
    await this.uow.run('logout', async (tx, ctx) => {
      await tx.session.deleteMany({ where: { id: sessionHash } });
      ctx.afterCommit(() => this.publisher.revokeSessions({ sessionHash }));
    });
  }

  // §5.1's password change. Step 1 already ran at the boundary; steps 2–6
  // are the shared function, with step 3 as the Supabase check.
  async changePassword(actor: Actor, currentPassword: string, newPassword: string): Promise<void> {
    await changePasswordCore(
      {
        studentId: actor.studentId,
        currentPassword,
        newPassword,
        checkCurrentPassword: passwordStep3(this.supabase),
        sessionHash: actor.sessionHash,
      },
      {
        prisma: this.prisma,
        supabase: this.supabase,
        uow: this.uow,
        checkpoints: this.checkpoints,
        publisher: this.publisher,
        logger: this.logger,
        lock: this.passwordLock,
      },
    );
  }
}
