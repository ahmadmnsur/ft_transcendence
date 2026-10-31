import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { AppLogger } from '../core/logger';
import { PrismaService } from '../core/prisma.service';
import { RealtimePublisher } from '../core/realtime-publisher';
import { clearSessionCookie, type ParsedCookie } from '../core/session-cookie';
import { SessionResolver, type SessionCookieSetter } from '../core/session-resolver';
import { SupabaseAuthClient } from '../core/supabase-auth';
import { CheckpointHook, UnitOfWork } from '../core/uow';
import { avatarUrlFor } from '../students/student-ref';
import {
  createAccountWithSession,
  toStudentView,
  type AccountExtraFields,
  type StudentView,
} from './account-create';
import { changePasswordCore, passwordStep3, PasswordChangeLock } from './password-change';
import { alreadySignedIn, noAccount } from './refusals';
import { createSessionAfterPasswordCheck } from './session-create';

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

  private async hasActiveSession(sessionToken: string | null): Promise<boolean> {
    if (sessionToken === null) return false;
    return (await this.sessions.resolveActive(sessionToken)) !== null;
  }

  async signup(input: {
    email: string;
    password: string;
    displayName: string;
    extra?: AccountExtraFields;
    sessionToken: string | null;
  }): Promise<{ student: StudentView; token: string; maxAge: number }> {
    if (await this.hasActiveSession(input.sessionToken)) throw alreadySignedIn();
    const created = await createAccountWithSession(input, {
      prisma: this.prisma,
      supabase: this.supabase,
      uow: this.uow,
    });
    return { student: created.student, token: created.token, maxAge: created.maxAge };
  }

  async login(input: {
    email: string;
    password: string;
    sessionToken: string | null;
  }): Promise<{
    student: StudentView;
    token: string;
    maxAge: number;
  }> {
    if (await this.hasActiveSession(input.sessionToken)) throw alreadySignedIn();
    const student = await this.prisma.student.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        passwordVersion: true,
        displayName: true,
        email: true,
        role: true,
        avatar: { select: { token: true } },
      },
    });
    if (student === null) throw noAccount();
    await passwordStep3(this.supabase)(student.id, input.password);
    const session = await createSessionAfterPasswordCheck(
      { studentId: student.id, expectedPasswordVersion: student.passwordVersion },
      { uow: this.uow },
    );
    return { student: toStudentView(student), token: session.token, maxAge: session.maxAge };
  }

  async resolveSession(
    cookie: ParsedCookie,
    response: SessionCookieSetter,
  ): Promise<{ authenticated: false } | { authenticated: true; student: StudentView }> {
    if (cookie.kind !== 'session') return { authenticated: false };
    const session = await this.sessions.resolveActive(cookie.token);
    if (session === null) {
      response.setHeader('Set-Cookie', clearSessionCookie());
      return { authenticated: false };
    }
    await this.sessions.renewIfStale(session, cookie.token, response);
    return {
      authenticated: true,
      student: {
        id: session.studentId,
        displayName: session.displayName,
        email: session.email,
        role: session.role,
        avatarUrl: avatarUrlFor(session.avatar),
      },
    };
  }

  async logout(actor: Actor): Promise<void> {
    if (actor.sessionHash === null) return;
    const sessionHash = actor.sessionHash;
    await this.uow.run('logout', async (tx, ctx) => {
      await tx.session.deleteMany({ where: { id: sessionHash } });
      ctx.afterCommit(() => this.publisher.revokeSessions({ sessionHash }));
    });
  }

  async changePassword(actor: Actor, currentPassword: string, newPassword: string): Promise<void> {
    await changePasswordCore(
      {
        studentId: actor.studentId,
        newPassword,
        checkStep3: () => passwordStep3(this.supabase)(actor.studentId, currentPassword),
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
