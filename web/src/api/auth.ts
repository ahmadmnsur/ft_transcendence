import { queryOptions } from '@tanstack/react-query';
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
// reaches here when the config said it is on. `link` is Connect 42 and also
// sends the current password; a `sign_in` or `confirm` start sends the
// intent alone.
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

// §5.6 B: the 42 sign-up form's pre-fill. Refusals and failures come back
// through `apiFetch` as usual: `oauth_failed` — no live draft — or a 404
// while 42 is off behind a stale `from=42` link sends the browser back to
// sign-in's `?oauth=failed`; any other failure is the form's own sentence.
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

// §5.6 B: the 42 sign-up form's request. Same body as an ordinary sign-up;
// the server takes the 42 id from the attempt the `a.` cookie names, never
// from this body. The answer is the student object, like an ordinary one.
export async function signup42(input: {
  email: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
}): Promise<SignedInStudent> {
  return apiFetch<SignedInStudent>('/auth/42/signup', { method: 'POST', body: input });
}

// §5.6 B: Disconnect 42. `{}` on success; the 200 refusals are
// `password_incorrect`, `too_many_attempts` and `forty_two_not_connected`;
// a signed-out caller gets the 401 `unauthenticated`, which `apiFetch`
// handles as it does everywhere.
export async function disconnect42(password: string): Promise<unknown> {
  return apiFetch<unknown>('/auth/42/disconnect', { method: 'POST', body: { password } });
}

// §5.6 C: the new password after Confirm with 42. `{}` on success, with the
// Student signed out everywhere, like the password change; the 200 refusals
// are `confirmation_required` and `password_incorrect` (a change that lost a
// race).
export async function setPasswordAfter42(newPassword: string): Promise<unknown> {
  return apiFetch<unknown>('/auth/42/password', { method: 'POST', body: { newPassword } });
}

// One query key for the 42 sign-up draft, read once per visit of the form.
// No draft leaves `data` undefined and the error decides: a dead draft
// (`oauth_failed` with no live draft, or 404 while 42 is off) goes back to
// sign-in's `?oauth=failed`; any other failure is the form's own sentence
// with a retry.
export const SIGN_UP_DRAFT_42_QUERY_KEY = ['auth', '42-draft'] as const;

export function signUpDraft42QueryOptions() {
  return queryOptions({
    queryKey: SIGN_UP_DRAFT_42_QUERY_KEY,
    queryFn: fetchSignUpDraft42,
    staleTime: 30_000,
  });
}
