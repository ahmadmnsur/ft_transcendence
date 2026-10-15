import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AppConfig } from '../core/app-config';

// §5.6 A: the two external calls of the transport, written here once and
// used by every intent. Fixed endpoints and scope (constants, not
// variables); the redirect URI is derived from PUBLIC_ORIGIN, registered on
// the 42 application byte-for-byte.
const AUTHORIZE_ENDPOINT = 'https://api.intra.42.fr/oauth/authorize';
const TOKEN_ENDPOINT = 'https://api.intra.42.fr/oauth/token';
const IDENTITY_ENDPOINT = 'https://api.intra.42.fr/v2/me';
const SCOPE = 'public';

// §5.6 A steps 6–7: a 10 s deadline, covering reading the body too, outside
// any transaction.
const TIMEOUT_MS = 10_000;

export type TokenAnswer = {
  accessToken: string;
  // `secret_valid_until`: null when 42 did not answer a date we can read —
  // the exchange still stands, only the warning is skipped.
  secretValidUntil: Date | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// 42 returns `secret_valid_until` as a Unix timestamp in seconds; a numeric
// string or a date string is accepted too, so a format change costs the
// warning, never the exchange.
function readSecretValidUntil(value: unknown): Date | null {
  let date: Date | null = null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    date = new Date(value * 1000);
  } else if (typeof value === 'string') {
    if (value.trim() !== '' && Number.isFinite(Number(value))) date = new Date(Number(value) * 1000);
    else date = new Date(value);
  }
  if (date === null || Number.isNaN(date.getTime())) return null;
  return date;
}

// §5.6 A: 42's OAuth endpoints, plain `fetch`, no package. Nothing here is
// logged: no code, token, verifier, secret, query or answer ever leaves
// except the values their callers need (§3.9).
@Injectable()
export class FortyTwoClient {
  constructor(private readonly config: AppConfig) {}

  // The pair only exists when the enabled guard admitted the request, so a
  // missing pair is a programming error, never a boot failure.
  private credentials(): { clientId: string; clientSecret: string } {
    const credentials = this.config.oauth42;
    if (credentials === null) throw new Error('42 OAuth is not configured');
    return credentials;
  }

  private redirectUri(): string {
    return `${this.config.publicOrigin}/api/auth/42/callback`;
  }

  // §5.6 A step 6: `client_id`, `redirect_uri`, `response_type=code`,
  // `scope=public`, `state`, `code_challenge` = base64url(SHA-256 of the
  // verifier), `code_challenge_method=S256`.
  authorizeUrl(state: string, codeVerifier: string): string {
    const url = new URL(AUTHORIZE_ENDPOINT);
    url.searchParams.set('client_id', this.credentials().clientId);
    url.searchParams.set('redirect_uri', this.redirectUri());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPE);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', createHash('sha256').update(codeVerifier).digest('base64url'));
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  // §5.6 A step 6: the code exchange, server-side, one 10 s deadline for the
  // whole request. Null for every failure; 42's answer is never logged and
  // never kept beyond the token and the secret's date.
  async exchangeCode(code: string, codeVerifier: string): Promise<TokenAnswer | null> {
    const credentials = this.credentials();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri(),
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code_verifier: codeVerifier,
    });
    let response: Response;
    try {
      response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: body.toString(),
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return null;
    }
    if (!response.ok) return null;
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return null;
    }
    if (!isRecord(payload) || typeof payload.access_token !== 'string') return null;
    return {
      accessToken: payload.access_token,
      secretValidUntil: readSecretValidUntil(payload.secret_valid_until),
    };
  }

  // §5.6 A step 7: `GET /v2/me` with the access token, same 10 s deadline.
  // 42's `id` — a number it never changes — and nothing else; null for every
  // failure. The token and the rest of the answer are dropped at once.
  async identityId(accessToken: string): Promise<number | null> {
    let response: Response;
    try {
      response = await fetch(IDENTITY_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return null;
    }
    if (!response.ok) return null;
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return null;
    }
    if (!isRecord(payload)) return null;
    const id = payload.id;
    return typeof id === 'number' && Number.isInteger(id) ? id : null;
  }
}
