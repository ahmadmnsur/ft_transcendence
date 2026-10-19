import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Clock } from '../core/clock';

// §5.6 A: one transport serves three intents — `sign_in` for Sign in with
// 42, `link` for Connect 42, `confirm` for Confirm with 42 (§5.6 C). The
// intent is part of the attempt from the start.
export const FORTY_TWO_INTENTS = ['sign_in', 'link', 'confirm'] as const;

export type FortyTwoIntent = (typeof FORTY_TWO_INTENTS)[number];

// §5.6 A step 4: an attempt lives ten minutes; the `a.` cookie's `Max-Age`
// carries the same number. A sign-up draft keeps the attempt's `expiresAt`
// (§5.6 B), so it ends with the same ten minutes.
export const ATTEMPT_TTL_SECONDS = 10 * 60;

// §5.6 C: a Confirm with 42 permission lives ten minutes from the callback
// that stored it, not from its attempt's start.
export const PERMISSION_TTL_SECONDS = 10 * 60;

// §5.6 A step 4: at most 1,000 entries, expired evicted first, then the
// oldest. Drafts live under the bound with the attempts.
const MAX_ATTEMPTS = 1000;

export type OAuthAttempt = {
  kind: 'attempt';
  // sha256(token), lower-case hex: the attempt token's for `sign_in`, the
  // session token's for `link` and `confirm`.
  bindingKey: string;
  state: string;
  codeVerifier: string;
  intent: FortyTwoIntent;
  // The Student who started a `link` or `confirm` flow. Null for `sign_in`,
  // which names no Student until the callback finds one by the identity.
  studentId: string | null;
  expiresAt: Date;
};

// §5.6 B: what a first 42 login keeps when no Student holds the id. It is
// not an attempt — verification has already succeeded. `take` removes
// whatever is under the key, so a callback carrying the same `a.` cookie
// does take the draft out, then takes the failure path because it is not
// an attempt. The draft replaces the attempt under the same key once
// verification succeeded, is read by `GET /api/auth/42/draft` and taken by
// `POST /api/auth/42/signup`. Same secret rules: never logged, never
// persisted.
export type SignUpDraft = {
  kind: 'draft';
  bindingKey: string;
  fortyTwoId: number;
  login: string;
  email: string;
  expiresAt: Date;
};

// §5.6 C: what a Confirm with 42 callback keeps once 42's `id` equals the
// Student's `forty_two_id`: leave to set one new password without the
// current one. Never a database row. It replaces the attempt under the same
// key, the session token's, is taken by `POST /api/auth/42/password` and
// used once. Same secret rules: never logged, never persisted.
export type ConfirmPermission = {
  kind: 'permission';
  bindingKey: string;
  studentId: string;
  fortyTwoId: number;
  expiresAt: Date;
};

export type OAuthStoreEntry = OAuthAttempt | SignUpDraft | ConfirmPermission;

// §3.4: the `auth` module's in-memory OAuth attempt store. Never persisted,
// never logged, lost on restart (§5.6 A step 4). Callers never hash tokens
// by hand: the key is derived here.
@Injectable()
export class OAuthAttemptStore {
  // Insertion order is recency order: `put` re-inserts a key, so the map's
  // first key is always the oldest.
  private readonly attempts = new Map<string, OAuthStoreEntry>();

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
  // `pc_session=a.<old>` names, so one browser never has two live entries.
  delete(bindingKey: string): void {
    this.attempts.delete(bindingKey);
  }

  // Stores an entry under its key, replacing whatever is there — a
  // superseded attempt or draft leaves no trace. At the bound, expired
  // entries are evicted first, then the oldest, so the store never exceeds
  // 1,000 entries.
  put(entry: OAuthStoreEntry): void {
    this.attempts.delete(entry.bindingKey);
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
    this.attempts.set(entry.bindingKey, entry);
  }

  // §5.6 A's callback step 2: the entry is **taken** — removed now, whatever
  // follows, so `state` and the verifier are used once. A draft or a
  // permission comes out the same way and is never an attempt; the caller
  // checks the kind, then the expiry as step 3. An expired entry comes out
  // like any other.
  take(bindingKey: string): OAuthStoreEntry | null {
    const entry = this.attempts.get(bindingKey);
    if (entry === undefined) return null;
    this.attempts.delete(bindingKey);
    return entry;
  }

  // §5.6 B: the draft the 42 sign-up form reads. It is never removed by this
  // read — `POST /api/auth/42/signup` takes it — but an expired draft is no
  // draft, so expiry answers here too.
  readDraft(bindingKey: string): SignUpDraft | null {
    const entry = this.attempts.get(bindingKey);
    if (entry === undefined || entry.kind !== 'draft') return null;
    if (entry.expiresAt.getTime() <= this.clock.now().getTime()) return null;
    return entry;
  }

  // §5.6 B: the draft the 42 sign-up form's request takes. Removed whatever
  // it is — used once; only a live draft is handed over.
  takeDraft(bindingKey: string): SignUpDraft | null {
    const entry = this.take(bindingKey);
    if (entry === null || entry.kind !== 'draft') return null;
    if (entry.expiresAt.getTime() <= this.clock.now().getTime()) return null;
    return entry;
  }

  // §5.6 C: the permission the new password's request takes — removed, live
  // or expired, so it is used once; only a live one is handed over. Anything
  // else under the session's key is a Connect or Confirm attempt in flight,
  // and stays: a stale request from another tab must not break its callback.
  takePermission(bindingKey: string): ConfirmPermission | null {
    const entry = this.attempts.get(bindingKey);
    if (entry === undefined || entry.kind !== 'permission') return null;
    this.attempts.delete(bindingKey);
    if (entry.expiresAt.getTime() <= this.clock.now().getTime()) return null;
    return entry;
  }
}
