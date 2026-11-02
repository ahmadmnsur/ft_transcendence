import { isValidPassword, newPasswordInvalidReason, type InvalidReason } from '@shared/limits';

export type CurrentPasswordError = 'empty' | 'invalid' | undefined;

export function currentPasswordError(password: string): CurrentPasswordError {
  if (password === '') return 'empty';
  return isValidPassword(password) ? undefined : 'invalid';
}

export function newPasswordErrors(
  newPassword: string,
  confirmPassword: string,
): { newError: InvalidReason | undefined; confirmError: boolean } {
  return {
    newError: newPasswordInvalidReason(newPassword),
    confirmError: confirmPassword.trim() !== newPassword.trim(),
  };
}
