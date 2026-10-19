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
import {
  changePasswordCore,
  passwordStep3,
  PasswordChangeLock,
  type PasswordStep3,
} from './password-change';
import {
  alreadySignedIn,
  confirmationRequired,
  fortyTwoConnected,
  fortyTwoNotConnected,
  oauthFailed,
} from './refusals';

// §5.6 A: the callback's one failure path, whatever the cause. The target
// follows the cookie kind: an `a.` value names a signed-out attempt, a
// resolved `s.` value names Connect 42, and an `s.` value that does not
// resolve, or no cookie at all, is the sign-in failure. The cause is never
// named, to the client or to a log.
const SIGN_IN_FAILURE = '/sign-in?oauth=failed';
const CONNECT_FAILURE = '/me?oauth=failed';

// The callback's §5.6 B and C outcomes beyond the failure path.
const FEED = '/';
const SIGN_UP_FROM_42 = '/sign-up?from=42';
const CONNECTED = '/me?oauth=connected';
const IN_USE = '/me?oauth=in_use';
const REMOVED = '/sign-in?oauth=removed';
const SUSPENDED = '/sign-in?oauth=suspended';
const CONFIRMED = '/me?oauth=confirmed';

// §5.6 A step 6: warn at each exchange once fewer than seven days of secret
// are left.
const SECRET_WARNING_MS = 7 * 24 * 60 * 60 * 1000;

// §3.6.2: the `Student_forty_two_id_key` unique is the backstop that keeps
// one 42 account on one Student, and its loser answers `oauth_failed`
// (§5.6 B, §6.15) with the code's one server sentence, `oauthFailed()`'s.
// Connect 42's callback maps that refusal to the `in_use` redirect §5.6 B
// names; the 42 sign-up lets it stand as the failure answer.
const FORTY_TWO_TAKEN: RefusalSpec = {
  code: 'oauth_failed',
  message: 'Sign in with 42 failed. Try again.',
};

export type Start42Result = {
  authorizeUrl: string;
  // The attempt token a `sign_in` start binds the browser with (`a.` cookie,
  // §5.6 A step 5). A `link` or `confirm` start binds by the session token,
  // so it sets no cookie and the session is not displaced.
  attemptToken: string | null;
};

// The callback's outcome: where the browser goes, whether the attempt cookie
// must be cleared, and the session cookie a successful 42 sign-in sets,
// which replaces the attempt cookie — the attempt token never becomes the
// session id (§5.6 B). An `s.` cookie is never cleared or renewed here.
export type Complete42Result = {
  location: string;
  clearAttemptCookie: boolean;
  sessionCookie?: { token: string; maxAge: number };
};

// The `state` a callback carries, compared against the stored one over
// SHA-256 digests in constant time (§5.6 A step 4): equal digests mean equal
// values (a hash collision is infeasible), so the comparison never depends
// on either value's length.
function sameState(queried: string | undefined, stored: string): boolean {
  if (queried === undefined) return false;
  const a = createHash('sha256').update(queried).digest();
  const b = createHash('sha256').update(stored).digest();
  return timingSafeEqual(a, b);
}

// §5.5 "Layer": the boundary owns the throttle, but for `link` the slot's
// email part is the signed-in Student's own email, known only once the
// service has resolved the session. The boundary supplies this wrapper: it
// reserves the slot for the email it is given (refusing when full), runs the
// check, settles the slot counted on a `CountedRefusal` and releases it in
// `finally` (§5.6 A step 2, M37).
export type ThrottledPasswordCheck = (email: string, check: () => Promise<void>) => Promise<void>;

// §3.4: `start42` and `complete42`, the transport and state of Sign in with
// 42, plus §5.6 B's draft, 42 sign-up and Disconnect 42, and §5.6 C's new
// password after Confirm with 42. The transport itself writes nothing
// (§5.6 A); the writes are the callback's session and link, the 42 sign-up's
// account, Disconnect 42's clear and the new password's password change. No
// network call inside a transaction (§3.6.2): Supabase Auth runs outside
// `uow.run`.
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

  // §5.6 A's start, steps 1–6. The boundary has already parsed the one
  // cookie and owns the throttle.
  async start42(input: {
    intent: FortyTwoIntent;
    password?: string;
    cookie: ParsedCookie;
    throttledCheck: ThrottledPasswordCheck;
  }): Promise<Start42Result> {
    if (input.intent === 'link') return this.startLink(input);
    if (input.intent === 'confirm') return this.startConfirm(input);

    // `sign_in`, as it has always been. A valid session refuses a second
    // sign-in; a carried `s.` that does not resolve is a signed-out browser
    // with a stale cookie, so the flow proceeds.
    if (input.cookie.kind === 'session') {
      if ((await this.sessions.resolveActive(input.cookie.token)) !== null) throw alreadySignedIn();
    }

    // Step 4: one live attempt per browser — the carried `a.` cookie's entry
    // is deleted first, so its callback will find nothing.
    if (input.cookie.kind === 'attempt') {
      this.attempts.delete(OAuthAttemptStore.bindingKey(input.cookie.token));
    }

    // Step 3: mint the token, the `state` and the PKCE verifier.
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

    // Step 6: the URL the SPA navigates to with `window.location.assign`.
    return { attemptToken, authorizeUrl: this.client.authorizeUrl(state, codeVerifier) };
  }

  // `link` and `confirm` need a valid session (§5.6 A step 1). The service
  // resolves it itself: the route is `@Public`, so no guard has. An
  // unresolved or non-`s.` cookie is 401 `unauthenticated`.
  private async signedInStart(
    cookie: ParsedCookie,
  ): Promise<{ session: ActiveSession; sessionToken: string; fortyTwoId: number | null }> {
    if (cookie.kind !== 'session') throw new ApiError('unauthenticated');
    const session = await this.sessions.resolveActive(cookie.token);
    if (session === null) throw new ApiError('unauthenticated');
    // Whether a 42 account is connected, re-read beside the resolve (§5.6 A
    // step 2).
    const holder = await this.prisma.student.findUnique({
      where: { id: session.studentId },
      select: { fortyTwoId: true },
    });
    if (holder === null) throw new ApiError('unauthenticated');
    return { session, sessionToken: cookie.token, fortyTwoId: holder.fortyTwoId };
  }

  // Steps 3–4 of a signed-in start: the entry is overwritten under the
  // session's key — a new start supersedes any attempt or permission there —
  // and the session is not displaced (§5.6 A step 3), so no cookie is set.
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

  // `link`, Connect 42 (§5.6 A step 2): session → connected → throttle →
  // password check → mint, in that order. Nothing is minted before the
  // current password is checked.
  private async startLink(input: {
    password?: string;
    cookie: ParsedCookie;
    throttledCheck: ThrottledPasswordCheck;
  }): Promise<Start42Result> {
    const { session, sessionToken, fortyTwoId } = await this.signedInStart(input.cookie);
    if (fortyTwoId !== null) throw fortyTwoConnected();
    if (input.password === undefined) throw new ApiError('validation_failed');

    // After the throttle, the current password: a refusal is counted under
    // the Student's own email (§5.5, M37) before anything is minted.
    const check = passwordStep3(this.supabase);
    await input.throttledCheck(session.email, () => check(session.studentId, input.password ?? ''));

    return this.mintSignedIn('link', sessionToken, session.studentId);
  }

  // `confirm`, Confirm with 42 (§5.6 A step 2): session → connected → mint.
  // No password and no throttle: 42's confirmation is what this flow checks
  // (§5.6 C).
  private async startConfirm(input: { cookie: ParsedCookie }): Promise<Start42Result> {
    const { session, sessionToken, fortyTwoId } = await this.signedInStart(input.cookie);
    if (fortyTwoId === null) throw fortyTwoNotConnected();
    return this.mintSignedIn('confirm', sessionToken, session.studentId);
  }

  // §5.6 A's callback, verification in the spec's order (steps 1–7), then
  // §5.6 B's mapping by intent. Every failure takes the one failure path,
  // whose target follows the cookie kind — and whose two answers are
  // decided here, by the request's own cookie alone, so the same answers
  // cover what was expected to fail and what was not: steps 1's resolve and
  // step 8's transactions are the service's own reads and writes (§3.6.2),
  // and an `a.` cookie left set on them, or 503/500 JSON in place of a
  // redirect on the browser's top-level navigation, is a half-open flow
  // (§5.6 A). The callback must always answer a redirect, so an unexpected
  // error is logged once — its class, any Prisma code, its frames; never
  // the query, the code, the token, the identity or the cookie (§3.9) — and
  // answered with the failure path that cookie names.
  async complete42(input: {
    cookie: ParsedCookie;
    query: { code?: string; state?: string; errorPresent: boolean };
  }): Promise<Complete42Result> {
    // Step 1: the cookie. An `a.` value names an attempt by its hash; an
    // `s.` value must resolve, and is left exactly as it is — never cleared,
    // never renewed, since this is not an authenticated request. The
    // failure-path answers live in these two fields: until a resolving `s.`
    // proves a Connect or Confirm attempt, the failure is the sign-in one.
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
        // Unresolved, or not resolving at all: the sign-in failure, the `s.`
        // cookie untouched either way.
        if (session === null) return fail();
        failureLocation = CONNECT_FAILURE;
        bindingKey = OAuthAttemptStore.bindingKey(input.cookie.token);
      }

      // Step 2: take whatever sits under the key — removed now, whatever
      // follows, so `state` and the verifier are used once.
      const taken = this.attempts.take(bindingKey);
      // Steps 3–5: it is a live attempt — a draft is never one; `state`
      // matches, compared in constant time; no `error` parameter at all — its
      // presence rejects whatever shape or value the parser gave it — and a
      // single `code` is present.
      if (taken === null || taken.kind !== 'attempt') return fail();
      const attempt: OAuthAttempt = taken;
      if (attempt.expiresAt.getTime() <= this.clock.now().getTime()) return fail();
      if (!sameState(input.query.state, attempt.state)) return fail();
      if (input.query.errorPresent) return fail();
      const code = input.query.code;
      if (code === undefined || code === '') return fail();

      // Step 6: the exchange, outside any transaction.
      const token = await this.client.exchangeCode(code, attempt.codeVerifier);
      if (token === null) return fail();
      this.warnWhenSecretEndsSoon(token.secretValidUntil);

      // Step 7: 42's `id`, and — read with it, the one moment the answer
      // exists (§5.6 A discards the rest of the answer at once, so it cannot
      // be kept until step 8) — `login` and `email`, which only a `sign_in`
      // whose `id` no Student holds needs, for the sign-up draft (§5.6 B).
      // Connect 42 and Confirm with 42 never need them, so they are not read
      // for either.
      const identity: FortyTwoIdentity | null = await this.client.identity(token.accessToken, {
        withProfile: attempt.intent === 'sign_in',
      });
      if (identity === null) return fail();

      // Step 8, by intent. `sign_in` needs an `a.` cookie, and `link` and
      // `confirm` need the resolving `s.` cookie of the Student who started —
      // a mismatched pair is just a stale attempt and takes the failure path.
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
      // Step 8's transactions can also fail on the engine — the concurrency
      // limit, a database error (§3.6.2) — and completeLink re-raises
      // whatever is not its unique refusal; whatever it was, the browser is
      // answered with this request's failure path.
      this.logger.entry('error', { operation: 'forty-two-callback', ...errorFields(err) });
      return fail();
    }
  }

  // §5.6 B's `sign_in` mapping. The Student is looked up by `forty_two_id`
  // ONLY — never by email or 42's login, which can change (ADR-0018 d7) —
  // and the lookup sits inside the one SSI transaction itself: a Disconnect
  // 42 committing since the flow started must answer through it, never with
  // a 500 JSON body on the browser's top-level navigation. Every outcome is
  // a redirect.
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
      // No Student holds the `id`: the transaction writes nothing, and the
      // store keeps a sign-up draft in its place after it returns (§5.6 B).
      if (student === null) return { kind: 'no_holder' as const };
      // A Removed or Suspended Student is told its own sentence once 42 has
      // confirmed the account, and the `a.` cookie goes (§5.6 B).
      if (student.removedAt !== null) {
        return { kind: 'redirect' as const, location: REMOVED, clearAttemptCookie: true };
      }
      if (student.suspendedAt !== null) {
        return { kind: 'redirect' as const, location: SUSPENDED, clearAttemptCookie: true };
      }
      await ctx.checkpoint('forty-two-sign-in');
      // The Session exactly as sign-in's (§5.1 step 4): 30 days, and this
      // transaction purges that Student's already-expired rows (§5.2).
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
      // No Student holds the `id`: the callback creates nothing (§5.4). In
      // place of the attempt it took, the store keeps a sign-up draft under
      // the same key with the attempt's `expiresAt`; the cookie stays and
      // the browser goes `302 /sign-up?from=42`.
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

  // §5.6 B's `link` mapping: one SSI transaction re-reads the Student, which
  // must still be Active, the attempt's `studentId` and without a 42 account
  // connected, else the failure path; and any other row holding the `id`, a
  // Removed one included, is `in_use`. The unique is the backstop, so its
  // refusal maps to the same `in_use` answer. The session is untouched.
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

  // §5.6 C's `confirm` branch: 42's `id` must equal the Student's
  // `forty_two_id`, re-read now, on a Student still Active; anything else
  // takes the failure path. Then the store keeps a permission in place of the
  // attempt it took, under the same key — the session token's — for ten
  // minutes from now, and nothing else is written: no database row, no
  // cookie. The session is untouched.
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
    this.attempts.put({
      kind: 'permission',
      bindingKey: input.bindingKey,
      studentId: input.studentId,
      fortyTwoId: input.identity.id,
      expiresAt: new Date(this.clock.now().getTime() + PERMISSION_TTL_SECONDS * 1000),
    });
    return { location: CONFIRMED, clearAttemptCookie: false };
  }

  // §5.6 B: the draft the 42 sign-up form reads. Only an `a.` cookie names a
  // draft, and the read never removes it; an expired draft is no draft.
  signUpDraft(cookie: ParsedCookie): { login: string; email: string } {
    if (cookie.kind !== 'attempt') throw oauthFailed();
    const draft = this.attempts.readDraft(OAuthAttemptStore.bindingKey(cookie.token));
    if (draft === null) throw oauthFailed();
    return { login: draft.login, email: draft.email };
  }

  // §5.6 B: the 42 sign-up form's request. §5.1's sign-up runs validation
  // first, then the throttle — so, in that order: the boundary validated the
  // body and checked the `a.` cookie; a live draft is read here, not taken
  // (§5.6 B), so a missing or expired draft costs no counted attempt; then
  // the throttle runs through `countAttempt`, the boundary's wrapper (§5.5
  // "Layer" — the service never touches the store), which counts the
  // attempt for the body's email; then, and only then, the draft is taken —
  // used once — and §5.1's sign-up runs from step 2, its transaction also
  // writing `forty_two_id` through `extra`.
  async signUp42(input: {
    attemptToken: string;
    email: string;
    password: string;
    displayName: string;
    // §5.5 "Layer": the boundary supplies this wrapper — reserve the slot
    // for the email, refuse `too_many_attempts` when it is full, settle it
    // counted — the same shape as `throttledCheck` above.
    countAttempt: (email: string) => void;
  }): Promise<{ student: StudentView; token: string; maxAge: number }> {
    // Read, not take: the draft survives a throttle refusal, so a full
    // bucket does not spend it — the throttle is only ever counted past it.
    const draft = this.attempts.readDraft(OAuthAttemptStore.bindingKey(input.attemptToken));
    if (draft === null) throw oauthFailed();
    input.countAttempt(input.email);
    // A concurrent request used the draft meanwhile: refused as §5.6 B's
    // no-live-draft case.
    const taken = this.attempts.takeDraft(OAuthAttemptStore.bindingKey(input.attemptToken));
    if (taken === null) throw oauthFailed();
    // §3.6.3 "One 42 account, one Student": this transaction also reads
    // whether any Student, a Removed one included, already holds the draft's
    // 42 `id` and refuses `oauth_failed` when one does, before it creates —
    // the unique stays the backstop (`FORTY_TWO_TAKEN` above).
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

  // §5.6 B: Disconnect 42. A service method acting for a signed-in Student
  // takes the boundary-built `Actor` (§3.4), and its write re-reads the
  // sanction flags inside its own SSI transaction — the HTTP guard's read
  // is never the authority (§3.4). The boundary has already validated the
  // body and counted the throttle under the Student's own email. The shared
  // password check first, then the transaction: no 42 account connected →
  // `forty_two_not_connected`; otherwise it clears `forty_two_id`. A
  // Removed or Suspended Student by then writes nothing, like every
  // session-bound write (§5.3): a Removed row keeps its 42 id.
  async disconnect42(input: { actor: Actor; password: string }): Promise<Record<string, never>> {
    await passwordStep3(this.supabase)(input.actor.studentId, input.password);
    await this.uow.run('forty-two-disconnect', async (tx) => {
      const student = await tx.student.findUnique({
        // §3.4: the actor's current flags, re-read here — never the guard's.
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

  // §5.6 C: the new password after Confirm with 42. The boundary has
  // validated it and resolved the session; there is no throttle, since the
  // route checks no password (§5.5). §5.1's password change runs with its
  // step 3 replaced by the permission, taken under this session's key so it
  // is used once, whatever follows: none, an expired one, or a Student whose
  // `forty_two_id`, re-read, no longer equals the confirmed one →
  // `confirmation_required`. Steps 4–6, the version guards and the lock
  // stand, so this change and an ordinary one never both go through.
  async setPassword42(input: { actor: Actor; sessionToken: string; newPassword: string }): Promise<void> {
    const bindingKey = OAuthAttemptStore.bindingKey(input.sessionToken);
    const confirmed: PasswordStep3 = async (studentId) => {
      const permission = this.attempts.takePermission(bindingKey);
      if (permission === null || permission.studentId !== studentId) throw confirmationRequired();
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { fortyTwoId: true },
      });
      if (student === null || student.fortyTwoId !== permission.fortyTwoId) throw confirmationRequired();
    };
    await changePasswordCore(
      {
        studentId: input.actor.studentId,
        // Step 3 checks the permission, not a password.
        currentPassword: '',
        newPassword: input.newPassword,
        checkCurrentPassword: confirmed,
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

  // §5.6 A step 6: names only the date, never the secret, the token or the
  // answer.
  private warnWhenSecretEndsSoon(secretValidUntil: Date | null): void {
    if (secretValidUntil === null) return;
    if (secretValidUntil.getTime() - this.clock.now().getTime() >= SECRET_WARNING_MS) return;
    this.logger.entry('warn', {
      operation: 'forty-two-secret',
      secretValidUntil: secretValidUntil.toISOString().slice(0, 10),
    });
  }
}
