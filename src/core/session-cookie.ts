import { createHash, randomBytes } from 'node:crypto';
import { parse, serialize } from 'cookie';

export const SESSION_COOKIE_NAME = 'pc_session';

export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const SESSION_RENEW_AFTER_MS = SESSION_TTL_SECONDS * 1000 - 60 * 60 * 1000;

export type CookieKind = 'session' | 'attempt' | 'none';

export type ParsedCookie = { kind: CookieKind; token: string };

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

export function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE_NAME}=s.${token}`;
}

export function clearSessionCookie(): string {
  return serialize(SESSION_COOKIE_NAME, '', attributes(0));
}

export function serializeAttemptCookie(token: string, maxAgeSeconds: number): string {
  return serialize(SESSION_COOKIE_NAME, `a.${token}`, attributes(maxAgeSeconds));
}

export function clearAttemptCookie(): string {
  return serialize(SESSION_COOKIE_NAME, '', attributes(0));
}

export function maxAgeUntil(expiresAt: Date, now: Date): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
}
