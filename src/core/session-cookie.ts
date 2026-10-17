import { createHash, randomBytes } from 'node:crypto';
import { parse, serialize } from 'cookie';

// §5.2: the only cookie. `HttpOnly; Secure; SameSite=Lax; Path=/`, no
// `Domain`; `Max-Age` is seconds until `expires_at`. Clearing uses the same
// name and attributes with `Max-Age=0`.
export const SESSION_COOKIE_NAME = 'pc_session';

export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const SESSION_RENEW_AFTER_MS = SESSION_TTL_SECONDS * 1000 - 60 * 60 * 1000;

export type CookieKind = 'session' | 'attempt' | 'none';

export type ParsedCookie = { kind: CookieKind; token: string };

// Only an `s.` value proceeds; `a.` (a live OAuth attempt, §5.6) or anything
// else never resolves to a session (§5.3).
export function parseSessionCookie(header: string | undefined): ParsedCookie {
  if (header === undefined || header === '') return { kind: 'none', token: '' };
  let value: string | undefined;
  try {
    value = parse(header)[SESSION_COOKIE_NAME];
  } catch {
    return { kind: 'none', token: '' };
  }
  if (typeof value !== 'string') return { kind: 'none', token: '' };
  if (value.startsWith('s.')) return { kind: 'session', token: value.slice(2) };
  if (value.startsWith('a.')) return { kind: 'attempt', token: value.slice(2) };
  return { kind: 'none', token: '' };
}

// A new session: 32 random bytes, base64url, in the cookie; `Session.id` is
// its lowercase hex SHA-256 (M6). A database read never yields a cookie.
export function newSessionToken(): { token: string; id: string } {
  const token = randomBytes(32).toString('base64url');
  const id = createHash('sha256').update(token).digest('hex');
  return { token, id };
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function attributes(maxAgeSeconds: number): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} {
  return { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: maxAgeSeconds };
}

export function serializeSessionCookie(token: string, maxAgeSeconds: number): string {
  return serialize(SESSION_COOKIE_NAME, `s.${token}`, attributes(maxAgeSeconds));
}

// The `Cookie` request header for a session token, built from the same name
// and prefix as the `Set-Cookie` above, so the harness and the server cannot
// drift apart (§16.2).
export function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE_NAME}=s.${token}`;
}

export function clearSessionCookie(): string {
  return serialize(SESSION_COOKIE_NAME, '', attributes(0));
}

// §5.6 A step 5: a live attempt's cookie, `a.<token>` with the session
// cookie's attributes, `Max-Age` 600.
export function serializeAttemptCookie(token: string, maxAgeSeconds: number): string {
  return serialize(SESSION_COOKIE_NAME, `a.${token}`, attributes(maxAgeSeconds));
}

// §5.6 A's failure path: clearing is by name and attributes only, so this is
// the same header as a session's clear; the name says which cookie the
// caller means to end. Only a request that carried an `a.` cookie ever gets
// it — an `s.` cookie is left alone.
export function clearAttemptCookie(): string {
  return serialize(SESSION_COOKIE_NAME, '', attributes(0));
}

// `Max-Age` derived from `expires_at` (§5.2, ADR-0003 d4).
export function maxAgeUntil(expiresAt: Date, now: Date): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
}
