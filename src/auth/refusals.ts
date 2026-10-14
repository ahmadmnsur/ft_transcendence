import { CountedRefusal, Refusal, type RefusalCode } from '../core/errors';

// §5.1's sentences where §5.1 gives one, a short English sentence otherwise.
// The SPA never displays these: it picks its own text by code (§6.15).
function refusal(code: RefusalCode, message: string): Refusal {
  return new Refusal(code, message);
}

function counted(code: RefusalCode, message: string): CountedRefusal {
  // A failure the boundary counts toward the throttle: `no_account` or
  // Supabase Auth refusing the password (§5.5).
  return new CountedRefusal(code, message);
}

export function noAccount(): CountedRefusal {
  return counted('no_account', 'No account uses this email.');
}

export function wrongPassword(): CountedRefusal {
  return counted('password_incorrect', 'Wrong password.');
}

// A moved `password_version`: also answered `password_incorrect`, but not
// counted — the race is lost, the password was not wrong (§5.5).
export function movedPasswordVersion(): Refusal {
  return refusal('password_incorrect', 'Wrong password.');
}

export function accountRemoved(): Refusal {
  return refusal('account_removed', "This account was removed and can't sign in again.");
}

export function accountSuspended(): Refusal {
  return refusal('account_suspended', 'Your account is suspended. Contact an Admin.');
}

export function emailUnavailable(): Refusal {
  return refusal('email_unavailable', 'This email is already in use.');
}

export function alreadySignedIn(): Refusal {
  return refusal('already_signed_in', 'You are already signed in.');
}

export function tooManyAttempts(): Refusal {
  // Also answers a Supabase 429, which is not counted (§5.1).
  return refusal('too_many_attempts', 'Too many attempts. Try again later.');
}
