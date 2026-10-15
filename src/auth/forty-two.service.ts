import { Injectable } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Clock } from '../core/clock';
import { ApiError } from '../core/errors';
import { AppLogger } from '../core/logger';
import type { ParsedCookie } from '../core/session-cookie';
import { SessionResolver } from '../core/session-resolver';
import { FortyTwoClient } from './forty-two-client';
import { ATTEMPT_TTL_SECONDS, OAuthAttemptStore, type FortyTwoIntent } from './oauth-attempt-store';
import { alreadySignedIn } from './refusals';

// §5.6 A: the callback's one failure path, whatever the cause. The redirect
// target is fixed; the cause is never named, to the client or to a log.
const FAILED_LOCATION = '/sign-in?oauth=failed';

// §5.6 A step 6: warn at each exchange once fewer than seven days of secret
// are left.
const SECRET_WARNING_MS = 7 * 24 * 60 * 60 * 1000;

export type Start42Result = { attemptToken: string; authorizeUrl: string };

// The callback's outcome: where the browser goes, and whether the attempt
// cookie must be cleared. An `s.` cookie is never cleared here.
export type Complete42Result = { location: string; clearAttemptCookie: boolean };

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

// §3.4: `start42` and `complete42`, the transport and state of Sign in with
// 42. `sign_in` is this ticket's; `link` and `confirm` arrive with #70 and
// #157 and are refused here until then, like a disabled 42. Neither method
// opens a transaction: the transport writes nothing (§5.6 A).
@Injectable()
export class FortyTwoService {
  constructor(
    private readonly attempts: OAuthAttemptStore,
    private readonly client: FortyTwoClient,
    private readonly sessions: SessionResolver,
    private readonly clock: Clock,
    private readonly logger: AppLogger,
  ) {}

  // §5.6 A's start, for `sign_in` only. The boundary has already parsed the
  // one cookie.
  async start42(input: { intent: FortyTwoIntent; cookie: ParsedCookie }): Promise<Start42Result> {
    if (input.intent !== 'sign_in') throw new ApiError('not_found');

    // Step 1: a valid session refuses a second sign-in. A carried `s.` that
    // does not resolve is a signed-out browser with a stale cookie, so the
    // flow proceeds.
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
      bindingKey: OAuthAttemptStore.bindingKey(attemptToken),
      state,
      codeVerifier,
      intent: input.intent,
      expiresAt: new Date(this.clock.now().getTime() + ATTEMPT_TTL_SECONDS * 1000),
    });

    // Step 6: the URL the SPA navigates to with `window.location.assign`.
    return { attemptToken, authorizeUrl: this.client.authorizeUrl(state, codeVerifier) };
  }

  // §5.6 A's callback, verification in the spec's order. Every failure takes
  // the one failure path; even a valid identity ends there until #70 stores
  // the mapping: no Student, no session, no database write.
  async complete42(input: {
    cookie: ParsedCookie;
    query: { code?: string; state?: string; errorPresent: boolean };
  }): Promise<Complete42Result> {
    const fail = (): Complete42Result => ({
      location: FAILED_LOCATION,
      clearAttemptCookie: input.cookie.kind === 'attempt',
    });

    // Step 1: the cookie. An `a.` value names an attempt by its hash; an
    // `s.` value must resolve, and is left exactly as it is — never cleared,
    // never renewed, since this is not an authenticated request.
    let bindingKey: string;
    if (input.cookie.kind === 'attempt') {
      bindingKey = OAuthAttemptStore.bindingKey(input.cookie.token);
    } else if (input.cookie.kind === 'session') {
      const session = await this.sessions.resolveActive(input.cookie.token);
      if (session === null) return fail();
      bindingKey = OAuthAttemptStore.bindingKey(input.cookie.token);
    } else {
      return fail();
    }

    // Step 2: take the attempt — removed whatever follows.
    const attempt = this.attempts.take(bindingKey);
    // Step 3: it exists and has not expired.
    if (attempt === null || attempt.expiresAt.getTime() <= this.clock.now().getTime()) return fail();
    // Step 4: `state` is present and matches, compared in constant time.
    if (!sameState(input.query.state, attempt.state)) return fail();
    // Step 5: no `error` parameter at all — its presence rejects whatever
    // shape or value the parser gave it, duplicate, empty or malformed
    // included — and a single `code` is present.
    if (input.query.errorPresent) return fail();
    const code = input.query.code;
    if (code === undefined || code === '') return fail();

    // Step 6: the exchange, outside any transaction. Success still ends on
    // the failure path below — the answer is dropped with the response, and
    // only the secret's date is read, for the warning.
    const token = await this.client.exchangeCode(code, attempt.codeVerifier);
    if (token === null) return fail();
    this.warnWhenSecretEndsSoon(token.secretValidUntil);

    // Step 7: 42's immutable `id` and nothing else.
    const fortyTwoId = await this.client.identityId(token.accessToken);
    if (fortyTwoId === null) return fail();

    // Step 8: the identity mapping is #70's. Until it lands, every callback
    // stops here: no Student and no session are created, and nothing is
    // written anywhere.
    return fail();
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
