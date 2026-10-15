import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Clock } from '../core/clock';

// §5.6 A: one transport serves three intents. `link` (Connect 42) and
// `confirm` (Confirm with 42) arrive with their own tickets; the intent is
// still part of the attempt from the start.
export const FORTY_TWO_INTENTS = ['sign_in', 'link', 'confirm'] as const;

export type FortyTwoIntent = (typeof FORTY_TWO_INTENTS)[number];

// §5.6 A step 4: an attempt lives ten minutes; the `a.` cookie's `Max-Age`
// carries the same number.
export const ATTEMPT_TTL_SECONDS = 10 * 60;

// §5.6 A step 4: at most 1,000 entries, expired evicted first, then the
// oldest.
const MAX_ATTEMPTS = 1000;

export type OAuthAttempt = {
  // sha256(token), lower-case hex: the attempt token's for `sign_in`, the
  // session token's for `link` and `confirm`.
  bindingKey: string;
  state: string;
  codeVerifier: string;
  intent: FortyTwoIntent;
  expiresAt: Date;
};

// §3.4: the `auth` module's in-memory OAuth attempt store. Never persisted,
// never logged, lost on restart (§5.6 A step 4). Callers never hash tokens
// by hand: the key is derived here.
@Injectable()
export class OAuthAttemptStore {
  // Insertion order is recency order: `put` re-inserts a key, so the map's
  // first key is always the oldest.
  private readonly attempts = new Map<string, OAuthAttempt>();

  constructor(private readonly clock: Clock) {}

  // §5.6 A steps 3–4: the binding key of an attempt token or a session
  // token.
  static bindingKey(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // §5.6 A step 3: the attempt token, the `state` and the PKCE verifier are
  // 32 random bytes each, base64url.
  static mint(): string {
    return randomBytes(32).toString('base64url');
  }

  // §5.6 A step 4: a `sign_in` start first deletes the entry a carried
  // `pc_session=a.<old>` names, so one browser never has two live attempts.
  delete(bindingKey: string): void {
    this.attempts.delete(bindingKey);
  }

  // Stores an attempt under its key, replacing any entry there. At the
  // bound, expired entries are evicted first, then the oldest, so the store
  // never exceeds 1,000 entries.
  put(attempt: OAuthAttempt): void {
    this.attempts.delete(attempt.bindingKey);
    if (this.attempts.size >= MAX_ATTEMPTS) {
      const now = this.clock.now().getTime();
      for (const [key, stored] of this.attempts) {
        if (stored.expiresAt.getTime() <= now) this.attempts.delete(key);
      }
      while (this.attempts.size >= MAX_ATTEMPTS) {
        const oldest = this.attempts.keys().next();
        if (oldest.done === true) break;
        this.attempts.delete(oldest.value);
      }
    }
    this.attempts.set(attempt.bindingKey, attempt);
  }

  // §5.6 A's callback step 2: the attempt is **taken** — removed now,
  // whatever follows, so `state` and the verifier are used once. An expired
  // entry comes out like any other; the caller checks its expiry as step 3.
  take(bindingKey: string): OAuthAttempt | null {
    const attempt = this.attempts.get(bindingKey);
    if (attempt === undefined) return null;
    this.attempts.delete(bindingKey);
    return attempt;
  }
}
