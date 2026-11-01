import { CountedRefusal, Refusal, type RefusalCode } from '../core/errors';

function refusal(code: RefusalCode, message: string): Refusal {
  return new Refusal(code, message);
}

function counted(code: RefusalCode, message: string): CountedRefusal {
  return new CountedRefusal(code, message);
}

export function noAccount(): CountedRefusal {
  return counted('no_account', 'Wrong email or password.');
}

export function wrongPassword(): CountedRefusal {
  return counted('password_incorrect', 'Wrong password.');
}

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

export function oauthFailed(): Refusal {
  return refusal('oauth_failed', 'Sign in with 42 failed. Try again.');
}

export function fortyTwoConnected(): Refusal {
  return refusal('forty_two_connected', 'This PeerConnect account already has a 42 account connected.');
}

export function fortyTwoNotConnected(): Refusal {
  return refusal('forty_two_not_connected', 'Your account has no 42 account connected.');
}

export function confirmationRequired(): Refusal {
  return refusal('confirmation_required', 'Confirm with 42 again, then set your new password.');
}

export function tooManyAttempts(): Refusal {
  return refusal('too_many_attempts', 'Too many attempts. Try again later.');
}
