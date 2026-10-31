import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Clock } from '../core/clock';

export const FORTY_TWO_INTENTS = ['sign_in', 'link', 'confirm'] as const;

export type FortyTwoIntent = (typeof FORTY_TWO_INTENTS)[number];

export const ATTEMPT_TTL_SECONDS = 10 * 60;

export const PERMISSION_TTL_SECONDS = 10 * 60;

const MAX_ATTEMPTS = 1000;

export type OAuthAttempt = {
  kind: 'attempt';
  bindingKey: string;
  state: string;
  codeVerifier: string;
  intent: FortyTwoIntent;
  studentId: string | null;
  expiresAt: Date;
};

export type SignUpDraft = {
  kind: 'draft';
  bindingKey: string;
  fortyTwoId: number;
  login: string;
  email: string;
  expiresAt: Date;
};

export type ConfirmPermission = {
  kind: 'permission';
  bindingKey: string;
  studentId: string;
  fortyTwoId: number;
  expiresAt: Date;
};

export type OAuthStoreEntry = OAuthAttempt | SignUpDraft | ConfirmPermission;

@Injectable()
export class OAuthAttemptStore {
  private readonly attempts = new Map<string, OAuthStoreEntry>();

  constructor(private readonly clock: Clock) {}

  static bindingKey(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  static mint(): string {
    return randomBytes(32).toString('base64url');
  }

  delete(bindingKey: string): void {
    this.attempts.delete(bindingKey);
  }

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

  hasAttempt(bindingKey: string): boolean {
    return this.attempts.get(bindingKey)?.kind === 'attempt';
  }

  take(bindingKey: string): OAuthStoreEntry | null {
    const entry = this.attempts.get(bindingKey);
    if (entry === undefined) return null;
    this.attempts.delete(bindingKey);
    return entry;
  }

  readDraft(bindingKey: string): SignUpDraft | null {
    const entry = this.attempts.get(bindingKey);
    if (entry === undefined || entry.kind !== 'draft') return null;
    if (entry.expiresAt.getTime() <= this.clock.now().getTime()) return null;
    return entry;
  }

  takeDraft(bindingKey: string): SignUpDraft | null {
    const entry = this.take(bindingKey);
    if (entry === null || entry.kind !== 'draft') return null;
    if (entry.expiresAt.getTime() <= this.clock.now().getTime()) return null;
    return entry;
  }

  takePermission(bindingKey: string): ConfirmPermission | null {
    const entry = this.attempts.get(bindingKey);
    if (entry === undefined || entry.kind !== 'permission') return null;
    this.attempts.delete(bindingKey);
    if (entry.expiresAt.getTime() <= this.clock.now().getTime()) return null;
    return entry;
  }
}
