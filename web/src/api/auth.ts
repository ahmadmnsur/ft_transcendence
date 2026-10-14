import type { SignedInStudent } from './session';
import { apiFetch } from './client';

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
