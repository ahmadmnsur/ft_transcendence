import type { SignedInStudent } from './session';
import { ApiProtocolError, apiFetch } from './client';

// §6.1: the account routes. Sign-up and sign-in return the student object,
// like `GET /api/session`'s; logout and the password change return `{}`.
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

// §5.6 A: the 42 transport's start. The caller navigates to `authorizeUrl`
// with `window.location.assign`. 404 while 42 is off, so the caller only
// reaches here when the config said it is on.
export async function start42(intent: 'sign_in'): Promise<{ authorizeUrl: string }> {
  const data = await apiFetch<unknown>('/auth/42/start', { method: 'POST', body: { intent } });
  const authorizeUrl = (data as { authorizeUrl?: unknown } | null)?.authorizeUrl;
  if (typeof authorizeUrl !== 'string' || authorizeUrl === '') {
    throw new ApiProtocolError(200, 'internal_error', 'The server returned an unexpected response.');
  }
  return { authorizeUrl };
}
