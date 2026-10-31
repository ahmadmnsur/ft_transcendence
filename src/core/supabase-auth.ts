import { Injectable } from '@nestjs/common';
import { AppConfig } from './app-config';
import { ApiError } from './errors';


export type PasswordCheckOutcome = 'accepted' | 'refused' | 'rate-limited' | 'unreachable';

export function supabaseLogin(studentId: string): string {
  return `${studentId}@peerconnect.invalid`;
}

const AUTH_TIMEOUT_MS = 10_000;

const ADMIN_LIST_PAGE_SIZE = 100;

function unreachable(): ApiError {
  return new ApiError('busy_retry_later');
}

function internalError(what: string): Error {
  return new Error(`Supabase Auth ${what} failed with an unexpected answer.`);
}

@Injectable()
export class SupabaseAuthClient {
  private readonly baseUrl: string;
  private readonly publishableKey: string;
  private readonly secretKey: string;

  constructor(config: AppConfig) {
    this.baseUrl = config.supabaseUrl.replace(/\/$/, '');
    this.publishableKey = config.supabasePublishableKey;
    this.secretKey = config.supabaseSecretKey;
  }

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
    if (response.status >= 500) {
      await SupabaseAuthClient.release(response);
      return 'unreachable';
    }
    if (!response.ok) {
      await SupabaseAuthClient.release(response);
      throw internalError('password check');
    }
    const accessToken = await this.accessToken(response);
    if (accessToken === null) throw internalError('password check');
    await this.signOut(accessToken);
    return 'accepted';
  }

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
      const err = response.status >= 500 ? unreachable() : internalError('admin create');
      await SupabaseAuthClient.release(response);
      throw err;
    }
    await SupabaseAuthClient.release(response);
  }

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
      const err = response.status >= 500 ? unreachable() : internalError('admin update');
      await SupabaseAuthClient.release(response);
      throw err;
    }
    await SupabaseAuthClient.release(response);
  }

  async adminListUserIds(): Promise<string[]> {
    const ids = new Set<string>();
    for (let page = 1; ; page++) {
      const users = await this.adminListPage(page);
      if (users.length === 0) return [...ids];
      const before = ids.size;
      for (const id of users) ids.add(id);
      if (ids.size === before) throw internalError('admin list');
    }
  }

  async adminDeleteUserOrThrow(userId: string): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          apikey: this.secretKey,
          Authorization: `Bearer ${this.secretKey}`,
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
      });
    } catch {
      throw unreachable();
    }
    await SupabaseAuthClient.release(response);
    if (!response.ok && response.status !== 404) {
      throw response.status >= 500 ? unreachable() : internalError('admin delete');
    }
  }

  async adminDeleteUser(studentId: string): Promise<void> {
    try {
      await this.adminDeleteUserOrThrow(studentId);
    } catch {
    }
  }

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
    }
  }

  private async adminListPage(page: number): Promise<string[]> {
    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/auth/v1/admin/users?page=${page}&per_page=${ADMIN_LIST_PAGE_SIZE}`,
        {
          method: 'GET',
          headers: {
            apikey: this.secretKey,
            Authorization: `Bearer ${this.secretKey}`,
          },
          redirect: 'manual',
          signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
        },
      );
    } catch {
      throw unreachable();
    }
    if (!response.ok) {
      const err = response.status >= 500 ? unreachable() : internalError('admin list');
      await SupabaseAuthClient.release(response);
      throw err;
    }
    let body: { users?: unknown };
    try {
      body = (await response.json()) as { users?: unknown };
    } catch {
      throw internalError('admin list');
    }
    if (!Array.isArray(body.users)) throw internalError('admin list');
    return body.users.map((user: unknown) => {
      const id = (user as { id?: unknown } | null)?.id;
      if (typeof id !== 'string') throw internalError('admin list');
      return id;
    });
  }

  private static async release(response: Response): Promise<void> {
    try {
      await response.body?.cancel();
    } catch {
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
