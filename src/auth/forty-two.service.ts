import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Clock } from '../core/clock';
import { ApiError, Refusal, type RefusalSpec } from '../core/errors';
import { AppLogger, errorFields } from '../core/logger';
import { PrismaService } from '../core/prisma.service';
import { RealtimePublisher } from '../core/realtime-publisher';
import type { ParsedCookie } from '../core/session-cookie';
import { SESSION_TTL_SECONDS, maxAgeUntil, newSessionToken } from '../core/session-cookie';
import type { ActiveSession } from '../core/session-resolver';
import { SessionResolver } from '../core/session-resolver';
import { SupabaseAuthClient } from '../core/supabase-auth';
import { CheckpointHook, UnitOfWork } from '../core/uow';
import { createAccountWithSession, type StudentView } from './account-create';
import { FortyTwoClient, type FortyTwoIdentity } from './forty-two-client';
import {
  OAuthAttemptStore,
  ATTEMPT_TTL_SECONDS,
  PERMISSION_TTL_SECONDS,
  type FortyTwoIntent,
  type OAuthAttempt,
} from './oauth-attempt-store';
import { changePasswordCore, passwordStep3, PasswordChangeLock } from './password-change';
import {
  alreadySignedIn,
  confirmationRequired,
  fortyTwoConnected,
  fortyTwoNotConnected,
  oauthFailed,
} from './refusals';

const SIGN_IN_FAILURE = '/sign-in?oauth=failed';
const CONNECT_FAILURE = '/me?oauth=failed';

const FEED = '/';
const SIGN_UP_FROM_42 = '/sign-up?from=42';
const CONNECTED = '/me?oauth=connected';
const IN_USE = '/me?oauth=in_use';
const REMOVED = '/sign-in?oauth=removed';
const SUSPENDED = '/sign-in?oauth=suspended';
const CONFIRMED = '/me?oauth=confirmed';

const SECRET_WARNING_MS = 7 * 24 * 60 * 60 * 1000;

const FORTY_TWO_TAKEN: RefusalSpec = {
  code: 'oauth_failed',
  message: 'Sign in with 42 failed. Try again.',
};

export type Start42Result = {
  authorizeUrl: string;
  attemptToken: string | null;
};

export type Complete42Result = {
  location: string;
  clearAttemptCookie: boolean;
  sessionCookie?: { token: string; maxAge: number };
};

function sameState(queried: string | undefined, stored: string): boolean {
  if (queried === undefined) return false;
  const a = createHash('sha256').update(queried).digest();
  const b = createHash('sha256').update(stored).digest();
  return timingSafeEqual(a, b);
}

export type ThrottledPasswordCheck = (email: string, check: () => Promise<void>) => Promise<void>;

@Injectable()
export class FortyTwoService {
  constructor(
    private readonly attempts: OAuthAttemptStore,
    private readonly client: FortyTwoClient,
    private readonly sessions: SessionResolver,
    private readonly clock: Clock,
    private readonly logger: AppLogger,
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseAuthClient,
    private readonly uow: UnitOfWork,
    private readonly checkpoints: CheckpointHook,
    private readonly publisher: RealtimePublisher,
    private readonly passwordLock: PasswordChangeLock,
  ) {}

  async start42(input: {
    intent: FortyTwoIntent;
    password?: string;
    cookie: ParsedCookie;
    throttledCheck: ThrottledPasswordCheck;
  }): Promise<Start42Result> {
    if (input.intent === 'link') return this.startLink(input);
    if (input.intent === 'confirm') return this.startConfirm(input);

    if (input.cookie.kind === 'session') {
      if ((await this.sessions.resolveActive(input.cookie.token)) !== null) throw alreadySignedIn();
    }

    if (input.cookie.kind === 'attempt') {
      this.attempts.delete(OAuthAttemptStore.bindingKey(input.cookie.token));
    }

    const attemptToken = OAuthAttemptStore.mint();
    const state = OAuthAttemptStore.mint();
    const codeVerifier = OAuthAttemptStore.mint();
    this.attempts.put({
      kind: 'attempt',
      bindingKey: OAuthAttemptStore.bindingKey(attemptToken),
      state,
      codeVerifier,
      intent: input.intent,
      studentId: null,
      expiresAt: new Date(this.clock.now().getTime() + ATTEMPT_TTL_SECONDS * 1000),
    });

    return { attemptToken, authorizeUrl: this.client.authorizeUrl(state, codeVerifier) };
  }

  private async signedInStart(
    cookie: ParsedCookie,
  ): Promise<{ session: ActiveSession; sessionToken: string; fortyTwoId: number | null }> {
    if (cookie.kind !== 'session') throw new ApiError('unauthenticated');
    const session = await this.sessions.resolveActive(cookie.token);
    if (session === null) throw new ApiError('unauthenticated');
    const holder = await this.prisma.student.findUnique({
      where: { id: session.studentId },
      select: { fortyTwoId: true },
    });
    if (holder === null) throw new ApiError('unauthenticated');
    return { session, sessionToken: cookie.token, fortyTwoId: holder.fortyTwoId };
  }

  private mintSignedIn(
    intent: 'link' | 'confirm',
    sessionToken: string,
    studentId: string,
  ): Start42Result {
    const state = OAuthAttemptStore.mint();
    const codeVerifier = OAuthAttemptStore.mint();
    this.attempts.put({
      kind: 'attempt',
      bindingKey: OAuthAttemptStore.bindingKey(sessionToken),
      state,
      codeVerifier,
      intent,
      studentId,
      expiresAt: new Date(this.clock.now().getTime() + ATTEMPT_TTL_SECONDS * 1000),
    });
    return { attemptToken: null, authorizeUrl: this.client.authorizeUrl(state, codeVerifier) };
  }

  private async startLink(input: {
    password?: string;
    cookie: ParsedCookie;
    throttledCheck: ThrottledPasswordCheck;
  }): Promise<Start42Result> {
    const { session, sessionToken, fortyTwoId } = await this.signedInStart(input.cookie);
    if (fortyTwoId !== null) throw fortyTwoConnected();
    if (input.password === undefined) throw new ApiError('validation_failed');

    const check = passwordStep3(this.supabase);
    await input.throttledCheck(session.email, () => check(session.studentId, input.password ?? ''));

    return this.mintSignedIn('link', sessionToken, session.studentId);
  }

  private async startConfirm(input: { cookie: ParsedCookie }): Promise<Start42Result> {
    const { session, sessionToken, fortyTwoId } = await this.signedInStart(input.cookie);
    if (fortyTwoId === null) throw fortyTwoNotConnected();
    return this.mintSignedIn('confirm', sessionToken, session.studentId);
  }

  async complete42(input: {
    cookie: ParsedCookie;
    query: { code?: string; state?: string; errorPresent: boolean };
  }): Promise<Complete42Result> {
    let bindingKey = '';
    let failureLocation = SIGN_IN_FAILURE;
    let session: ActiveSession | null = null;
    const clearOnFailure = input.cookie.kind === 'attempt';
    const fail = (): Complete42Result => this.onFailure(failureLocation, clearOnFailure);
    try {
      if (input.cookie.kind === 'attempt') {
        bindingKey = OAuthAttemptStore.bindingKey(input.cookie.token);
      } else if (input.cookie.kind === 'session') {
        session = await this.sessions.resolveActive(input.cookie.token);
        if (session === null) return fail();
        failureLocation = CONNECT_FAILURE;
        bindingKey = OAuthAttemptStore.bindingKey(input.cookie.token);
      }

      const taken = this.attempts.take(bindingKey);
      if (taken === null || taken.kind !== 'attempt') return fail();
      const attempt: OAuthAttempt = taken;
      if (attempt.expiresAt.getTime() <= this.clock.now().getTime()) return fail();
      if (!sameState(input.query.state, attempt.state)) return fail();
      if (input.query.errorPresent) return fail();
      const code = input.query.code;
      if (code === undefined || code === '') return fail();

      const token = await this.client.exchangeCode(code, attempt.codeVerifier);
      if (token === null) return fail();
      this.warnWhenSecretEndsSoon(token.secretValidUntil);

      const identity: FortyTwoIdentity | null = await this.client.identity(token.accessToken, {
        withProfile: attempt.intent === 'sign_in',
      });
      if (identity === null) return fail();

      if (attempt.intent === 'sign_in') {
        if (input.cookie.kind !== 'attempt') return fail();
        return await this.completeSignIn({ identity, bindingKey, attemptExpiresAt: attempt.expiresAt });
      }
      if (session === null || session.studentId !== attempt.studentId) return fail();
      if (attempt.intent === 'link') {
        return await this.completeLink({ identity, studentId: session.studentId, fail });
      }
      return await this.completeConfirm({ identity, studentId: session.studentId, bindingKey, fail });
    } catch (err) {
      this.logger.entry('error', { operation: 'forty-two-callback', ...errorFields(err) });
      return fail();
    }
  }

  private async completeSignIn(input: {
    identity: FortyTwoIdentity;
    bindingKey: string;
    attemptExpiresAt: Date;
  }): Promise<Complete42Result> {
    const outcome = await this.uow.run('forty-two-sign-in', async (tx, ctx) => {
      const student = await tx.student.findUnique({
        where: { fortyTwoId: input.identity.id },
        select: { id: true, removedAt: true, suspendedAt: true },
      });
      if (student === null) return { kind: 'no_holder' as const };
      if (student.removedAt !== null) {
        return { kind: 'redirect' as const, location: REMOVED, clearAttemptCookie: true };
      }
      if (student.suspendedAt !== null) {
        return { kind: 'redirect' as const, location: SUSPENDED, clearAttemptCookie: true };
      }
      await ctx.checkpoint('forty-two-sign-in');
      const expiresAt = new Date(ctx.now.getTime() + SESSION_TTL_SECONDS * 1000);
      const session = newSessionToken();
      await tx.session.create({ data: { id: session.id, studentId: student.id, expiresAt } });
      await tx.session.deleteMany({ where: { studentId: student.id, expiresAt: { lte: ctx.now } } });
      return {
        kind: 'redirect' as const,
        location: FEED,
        clearAttemptCookie: false,
        sessionCookie: { token: session.token, maxAge: maxAgeUntil(expiresAt, ctx.now) },
      };
    });
    if (outcome.kind === 'no_holder') {
      this.attempts.put({
        kind: 'draft',
        bindingKey: input.bindingKey,
        fortyTwoId: input.identity.id,
        login: input.identity.login,
        email: input.identity.email,
        expiresAt: input.attemptExpiresAt,
      });
      return { location: SIGN_UP_FROM_42, clearAttemptCookie: false };
    }
    return {
      location: outcome.location,
      clearAttemptCookie: outcome.clearAttemptCookie,
      sessionCookie: outcome.sessionCookie,
    };
  }

  private async completeLink(input: {
    identity: FortyTwoIdentity;
    studentId: string;
    fail: () => Complete42Result;
  }): Promise<Complete42Result> {
    try {
      const outcome = await this.uow.run(
        { name: 'forty-two-link', uniqueRefusals: { Student_forty_two_id_key: FORTY_TWO_TAKEN } },
        async (tx, ctx) => {
          const student = await tx.student.findUnique({
            where: { id: input.studentId },
            select: { removedAt: true, suspendedAt: true, fortyTwoId: true },
          });
          if (
            student === null ||
            student.removedAt !== null ||
            student.suspendedAt !== null ||
            student.fortyTwoId !== null
          ) {
            return { kind: 'failed' as const };
          }
          const holder = await tx.student.findFirst({
            where: { fortyTwoId: input.identity.id, id: { not: input.studentId } },
            select: { id: true },
          });
          if (holder !== null) return { kind: 'in_use' as const };
          await ctx.checkpoint('forty-two-link');
          await tx.student.update({
            where: { id: input.studentId },
            data: { fortyTwoId: input.identity.id },
          });
          return { kind: 'connected' as const };
        },
      );
      if (outcome.kind === 'failed') return input.fail();
      if (outcome.kind === 'in_use') return { location: IN_USE, clearAttemptCookie: false };
      return { location: CONNECTED, clearAttemptCookie: false };
    } catch (err) {
      if (err instanceof Refusal && err.code === FORTY_TWO_TAKEN.code) {
        return { location: IN_USE, clearAttemptCookie: false };
      }
      throw err;
    }
  }

  private async completeConfirm(input: {
    identity: FortyTwoIdentity;
    studentId: string;
    bindingKey: string;
    fail: () => Complete42Result;
  }): Promise<Complete42Result> {
    const student = await this.prisma.student.findUnique({
      where: { id: input.studentId },
      select: { removedAt: true, suspendedAt: true, fortyTwoId: true },
    });
    if (
      student === null ||
      student.removedAt !== null ||
      student.suspendedAt !== null ||
      student.fortyTwoId !== input.identity.id
    ) {
      return input.fail();
    }
    if (this.attempts.hasAttempt(input.bindingKey)) return input.fail();
    this.attempts.put({
      kind: 'permission',
      bindingKey: input.bindingKey,
      studentId: input.studentId,
      fortyTwoId: input.identity.id,
      expiresAt: new Date(this.clock.now().getTime() + PERMISSION_TTL_SECONDS * 1000),
    });
    return { location: CONFIRMED, clearAttemptCookie: false };
  }

  signUpDraft(cookie: ParsedCookie): { login: string; email: string } {
    if (cookie.kind !== 'attempt') throw oauthFailed();
    const draft = this.attempts.readDraft(OAuthAttemptStore.bindingKey(cookie.token));
    if (draft === null) throw oauthFailed();
    return { login: draft.login, email: draft.email };
  }

  async signUp42(input: {
    attemptToken: string;
    email: string;
    password: string;
    displayName: string;
    countAttempt: (email: string) => void;
  }): Promise<{ student: StudentView; token: string; maxAge: number }> {
    const draft = this.attempts.readDraft(OAuthAttemptStore.bindingKey(input.attemptToken));
    if (draft === null) throw oauthFailed();
    input.countAttempt(input.email);
    const taken = this.attempts.takeDraft(OAuthAttemptStore.bindingKey(input.attemptToken));
    if (taken === null) throw oauthFailed();
    const created = await createAccountWithSession(
      {
        email: input.email,
        password: input.password,
        displayName: input.displayName,
        extra: { fortyTwoId: draft.fortyTwoId },
        uniqueRefusals: { Student_forty_two_id_key: FORTY_TWO_TAKEN },
        beforeCreate: async (tx) => {
          const holder = await tx.student.findUnique({
            where: { fortyTwoId: draft.fortyTwoId },
            select: { id: true },
          });
          if (holder !== null) throw oauthFailed();
        },
      },
      { prisma: this.prisma, supabase: this.supabase, uow: this.uow },
    );
    return { student: created.student, token: created.token, maxAge: created.maxAge };
  }

  async disconnect42(input: { actor: Actor; password: string }): Promise<Record<string, never>> {
    await passwordStep3(this.supabase)(input.actor.studentId, input.password);
    await this.uow.run('forty-two-disconnect', async (tx) => {
      const student = await tx.student.findUnique({
        where: { id: input.actor.studentId },
        select: { removedAt: true, suspendedAt: true, fortyTwoId: true },
      });
      if (student === null || student.removedAt !== null || student.suspendedAt !== null) {
        throw new ApiError('unauthenticated');
      }
      if (student.fortyTwoId === null) throw fortyTwoNotConnected();
      await tx.student.update({
        where: { id: input.actor.studentId },
        data: { fortyTwoId: null },
      });
    });
    return {};
  }

  async setPasswordAfter42(input: {
    actor: Actor;
    sessionToken: string;
    newPassword: string;
  }): Promise<void> {
    const { studentId } = input.actor;
    const bindingKey = OAuthAttemptStore.bindingKey(input.sessionToken);
    let confirmedFortyTwoId: number | null = null;
    await changePasswordCore(
      {
        studentId,
        newPassword: input.newPassword,
        checkStep3: async () => {
          const permission = this.attempts.takePermission(bindingKey);
          if (permission === null || permission.studentId !== studentId) throw confirmationRequired();
          confirmedFortyTwoId = permission.fortyTwoId;
        },
        recheckInStep4: async (tx) => {
          const student = await tx.student.findUnique({
            where: { id: studentId },
            select: { fortyTwoId: true },
          });
          if (
            confirmedFortyTwoId === null ||
            student === null ||
            student.fortyTwoId !== confirmedFortyTwoId
          ) {
            throw confirmationRequired();
          }
        },
        sessionHash: input.actor.sessionHash,
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

  private onFailure(location: string, clearAttemptCookie: boolean): Complete42Result {
    return { location, clearAttemptCookie };
  }

  private warnWhenSecretEndsSoon(secretValidUntil: Date | null): void {
    if (secretValidUntil === null) return;
    if (secretValidUntil.getTime() - this.clock.now().getTime() >= SECRET_WARNING_MS) return;
    this.logger.entry('warn', {
      operation: 'forty-two-secret',
      secretValidUntil: secretValidUntil.toISOString().slice(0, 10),
    });
  }
}
