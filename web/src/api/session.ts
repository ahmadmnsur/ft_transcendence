import { queryOptions } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { Role } from '@shared/roles';
import { ROLES } from '@shared/roles';
import { ApiProtocolError, apiFetch } from './client';

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

export async function fetchSession(): Promise<SessionValue> {
  const data = await apiFetch<unknown>('/session');
  if (!isRecord(data) || typeof data.authenticated !== 'boolean') throw unexpected();
  if (!data.authenticated) return { authenticated: false };
  if (!isStudent(data.student)) throw unexpected();
  return { authenticated: true, student: data.student };
}

export function sessionQueryOptions() {
  return queryOptions({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 30_000,
  });
}

export function setSignedOut(client: QueryClient): void {
  client.clear();
  client.setQueryData(SESSION_QUERY_KEY, { authenticated: false });
}

function signedInStudentId(client: QueryClient): string | null {
  const session = client.getQueryData<SessionValue>(SESSION_QUERY_KEY);
  return session?.authenticated === true ? session.student.id : null;
}

export async function writeAsSignedIn<T>(
  client: QueryClient,
  send: () => Promise<T>,
  apply: (result: T) => Promise<void>,
  reread: () => void,
): Promise<void> {
  const writer = signedInStudentId(client);
  let result: T;
  try {
    result = await send();
  } catch (error) {
    if (signedInStudentId(client) === writer) reread();
    throw error;
  }
  if (signedInStudentId(client) !== writer) return;
  await apply(result);
}
