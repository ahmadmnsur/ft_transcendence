import { Injectable } from '@nestjs/common';
import { AppConfig } from './app-config';
import { ApiError } from './errors';

// §5.1: Supabase Auth keeps each password; only the API calls it, from the
// server, with the publishable key for the password grant and the secret key
// for the admin calls. Plain `fetch`, no Supabase package.
//
// Nothing secret ever leaves this module in a log, an error, a return value
// or storage: passwords, tokens, keys, the cookie, Supabase response bodies
// and throttle keys are never logged, returned or stored.

export type PasswordCheckOutcome = 'accepted' | 'refused' | 'rate-limited' | 'unreachable';

// Supabase Auth's login for a Student: the real email never goes there (§5.1).
export function supabaseLogin(studentId: string): string {
  return `${studentId}@peerconnect.invalid`;
}

const AUTH_TIMEOUT_MS = 10_000;

function unreachable(): ApiError {
  // 503 busy_retry_later: Supabase Auth unreachable is never a credentials
  // refusal (§5.1, §3.8.2).
  return new ApiError('busy_retry_later');
}

function internalError(what: string): Error {
  // Any other unexpected status (a wrong key's 401/403, a 4xx on admin
  // create) is an internal error, never a credentials refusal. The message
  // is fixed: no status, body or key is ever attached.
  return new Error(`Supabase Auth ${what} failed with an unexpected answer.`);
}

@Injectable()
export class SupabaseAuthClient {
  private readonly baseUrl: string;
  private readonly publishableKey: string;
  private readonly secretKey: string;

  // The keys come through AppConfig, which refuses to construct when they
  // are missing, like PUBLIC_ORIGIN (§5.1).
  constructor(config: AppConfig) {
    this.baseUrl = config.supabaseUrl.replace(/\/$/, '');
    this.publishableKey = config.supabasePublishableKey;
    this.secretKey = config.supabaseSecretKey;
  }

  // §5.1's password check, shared by sign-in, the password change's step 3
  // (and later Connect/Disconnect 42): the password grant on the Student's
  // login, then one sign-out of the Supabase session it returns, best
  // effort. The tokens are dropped with the response; accepted, refused
  // (400), rate-limited (429) and unreachable (no answer, timeout, 5xx, 540)
  // are the only answers that leave this function normally.
  async checkPassword(studentId: string, password: string): Promise<PasswordCheckOutcome> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: this.publishableKey,
          Authorization: `Bearer ${this.publishableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: supabaseLogin(studentId), password }),
        redirect: 'manual',
        signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
      });
    } catch {
      return 'unreachable';
    }
    if (response.status === 400 || response.status === 429) {
      await SupabaseAuthClient.release(response);
      return response.status === 400 ? 'refused' : 'rate-limited';
    }
    // 540, a paused project, falls under the 5xx below.
    if (response.status >= 500) {
      await SupabaseAuthClient.release(response);
      return 'unreachable';
    }
    if (!response.ok) {
      await SupabaseAuthClient.release(response);
      throw internalError('password check');
    }
    const accessToken = await this.accessToken(response);
    // A 200 without a token is unexpected: internal, never accepted.
    if (accessToken === null) throw internalError('password check');
    // Best effort: a failed sign-out never fails the request (§5.1).
    await this.signOut(accessToken);
    return 'accepted';
  }

  // Sign-up's step 4: that id, the login, the password, `email_confirm`.
  async adminCreateUser(studentId: string, password: string): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          apikey: this.secretKey,
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: studentId,
          email: supabaseLogin(studentId),
          password,
          email_confirm: true,
        }),
        redirect: 'manual',
        signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
      });
    } catch {
      throw unreachable();
    }
    if (!response.ok) {
      // 540, a paused project, falls under the 5xx below.
      const err = response.status >= 500 ? unreachable() : internalError('admin create');
      await SupabaseAuthClient.release(response);
      throw err;
    }
    await SupabaseAuthClient.release(response);
  }

  // The password change's step 5: the new password, by id.
  async adminUpdatePassword(studentId: string, password: string): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/auth/v1/admin/users/${studentId}`, {
        method: 'PUT',
        headers: {
          apikey: this.secretKey,
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
        redirect: 'manual',
        signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
      });
    } catch {
      throw unreachable();
    }
    if (!response.ok) {
      // 540, a paused project, falls under the 5xx below.
      const err = response.status >= 500 ? unreachable() : internalError('admin update');
      await SupabaseAuthClient.release(response);
      throw err;
    }
    await SupabaseAuthClient.release(response);
  }

  // The losing duplicate sign-up's cleanup, and the resets: best effort,
  // every failure swallowed (§5.1).
  async adminDeleteUser(studentId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/v1/admin/users/${studentId}`, {
        method: 'DELETE',
        headers: {
          apikey: this.secretKey,
          Authorization: `Bearer ${this.secretKey}`,
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
      });
      await SupabaseAuthClient.release(response);
    } catch {
      // Best effort: nothing was promised.
    }
  }

  // The access token of an accepted grant, read once so the session can be
  // signed out.
  private async signOut(accessToken: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: this.publishableKey,
          Authorization: `Bearer ${accessToken}`,
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
      });
      await SupabaseAuthClient.release(response);
    } catch {
      // Best effort.
    }
  }

  // Releases a response whose body is never read, so its connection is not
  // held until garbage collection. Never throws, never logs the body.
  private static async release(response: Response): Promise<void> {
    try {
      await response.body?.cancel();
    } catch {
      // Best effort.
    }
  }

  private async accessToken(response: Response): Promise<string | null> {
    try {
      const body = (await response.json()) as { access_token?: unknown };
      return typeof body.access_token === 'string' ? body.access_token : null;
    } catch {
      return null;
    }
  }
}
