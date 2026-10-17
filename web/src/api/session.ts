import { queryOptions } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { Role } from '@shared/roles';
import { ROLES } from '@shared/roles';
import { ApiProtocolError, apiFetch } from './client';

// §6.1: what GET /api/session reports. `avatarUrl` is a string or null.
export interface SignedInStudent {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
}

export type SessionValue = { authenticated: false } | { authenticated: true; student: SignedInStudent };

export const SESSION_QUERY_KEY = ['session'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStudent(value: unknown): value is SignedInStudent {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.displayName !== 'string') return false;
  if (typeof value.email !== 'string') return false;
  if (typeof value.role !== 'string' || !(ROLES as ReadonlyArray<string>).includes(value.role)) return false;
  return value.avatarUrl === null || typeof value.avatarUrl === 'string';
}

function unexpected(): ApiProtocolError {
  return new ApiProtocolError(200, 'internal_error', 'The server returned an unexpected response.');
}

// A fresh fetch, never the Query cache. It goes through the client, whose
// 401 path skips `/session`: the probe is what that path calls, so it must
// not call back into it (§3.8.2). Only the shape of `data` is checked here.
export async function fetchSession(): Promise<SessionValue> {
  const data = await apiFetch<unknown>('/session');
  if (!isRecord(data) || typeof data.authenticated !== 'boolean') throw unexpected();
  if (!data.authenticated) return { authenticated: false };
  if (!isStudent(data.student)) throw unexpected();
  return { authenticated: true, student: data.student };
}

// One query key for the session, briefly cached for components that read
// it. The guard bypasses the cache with `staleTime: 0` and always probes.
export function sessionQueryOptions() {
  return queryOptions({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 30_000,
  });
}

// Drops the signed-in Student's cached server state and takes the session
// query to its signed-out value (§3.8.2). The router's 401 handler and the
// socket's terminal outcomes both use it, so the two cannot drift apart.
export function setSignedOut(client: QueryClient): void {
  client.clear();
  client.setQueryData(SESSION_QUERY_KEY, { authenticated: false });
}
