import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AppConfig } from '../core/app-config';

const AUTHORIZE_ENDPOINT = 'https://api.intra.42.fr/oauth/authorize';
const TOKEN_ENDPOINT = 'https://api.intra.42.fr/oauth/token';
const IDENTITY_ENDPOINT = 'https://api.intra.42.fr/v2/me';
const SCOPE = 'public';

const TIMEOUT_MS = 10_000;

export type TokenAnswer = {
  accessToken: string;
  secretValidUntil: Date | null;
};

export type FortyTwoIdentity = { id: number; login: string; email: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

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

@Injectable()
export class FortyTwoClient {
  constructor(private readonly config: AppConfig) {}

  private credentials(): { clientId: string; clientSecret: string } {
    const credentials = this.config.oauth42;
    if (credentials === null) throw new Error('42 OAuth is not configured');
    return credentials;
  }

  private redirectUri(): string {
    return `${this.config.publicOrigin}/api/auth/42/callback`;
  }

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

  async identity(
    accessToken: string,
    options: { withProfile: boolean },
  ): Promise<FortyTwoIdentity | null> {
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
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 1 || id > 2147483647) return null;
    const login = options.withProfile && typeof payload.login === 'string' ? payload.login : '';
    const email = options.withProfile && typeof payload.email === 'string' ? payload.email : '';
    return { id, login, email };
  }
}
