import { queryOptions } from '@tanstack/react-query';
import type { SignedInStudent } from './session';
import { ApiProtocolError, apiFetch } from './client';

export async function signup(input: {
  email: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
}): Promise<SignedInStudent> {
  return apiFetch<SignedInStudent>('/auth/signup', { method: 'POST', body: input });
}

export async function login(input: { email: string; password: string }): Promise<SignedInStudent> {
  return apiFetch<SignedInStudent>('/auth/login', { method: 'POST', body: input });
}

export async function logout(): Promise<unknown> {
  return apiFetch<unknown>('/auth/logout', { method: 'POST', body: {} });
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<unknown> {
  return apiFetch<unknown>('/auth/password', { method: 'POST', body: input });
}

export async function start42(
  intent: 'sign_in' | 'link' | 'confirm',
  password?: string,
): Promise<{ authorizeUrl: string }> {
  const body: Record<string, string> = { intent };
  if (password !== undefined) body.password = password;
  const data = await apiFetch<unknown>('/auth/42/start', { method: 'POST', body });
  const authorizeUrl = (data as { authorizeUrl?: unknown } | null)?.authorizeUrl;
  if (typeof authorizeUrl !== 'string' || authorizeUrl === '') {
    throw new ApiProtocolError(200, 'internal_error', 'The server returned an unexpected response.');
  }
  return { authorizeUrl };
}

export async function fetchSignUpDraft42(): Promise<{ login: string; email: string }> {
  const data = await apiFetch<unknown>('/auth/42/draft');
  if (
    data === null ||
    typeof data !== 'object' ||
    typeof (data as { login?: unknown }).login !== 'string' ||
    typeof (data as { email?: unknown }).email !== 'string'
  ) {
    throw new ApiProtocolError(200, 'internal_error', 'The server returned an unexpected response.');
  }
  return data as { login: string; email: string };
}

export async function signup42(input: {
  email: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
}): Promise<SignedInStudent> {
  return apiFetch<SignedInStudent>('/auth/42/signup', { method: 'POST', body: input });
}

export async function disconnect42(password: string): Promise<unknown> {
  return apiFetch<unknown>('/auth/42/disconnect', { method: 'POST', body: { password } });
}

export async function setPasswordAfter42(newPassword: string): Promise<unknown> {
  return apiFetch<unknown>('/auth/42/password', { method: 'POST', body: { newPassword } });
}

export const SIGN_UP_DRAFT_42_QUERY_KEY = ['auth', '42-draft'] as const;

export function signUpDraft42QueryOptions() {
  return queryOptions({
    queryKey: SIGN_UP_DRAFT_42_QUERY_KEY,
    queryFn: fetchSignUpDraft42,
    staleTime: 30_000,
  });
}
