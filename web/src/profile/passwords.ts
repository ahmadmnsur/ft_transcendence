import { isValidPassword } from '@shared/limits';

export type CurrentPasswordError = 'empty' | 'invalid' | undefined;

export function currentPasswordError(password: string): CurrentPasswordError {
  if (password === '') return 'empty';
  return isValidPassword(password) ? undefined : 'invalid';
}

export function newPasswordErrors(
  newPassword: string,
  confirmPassword: string,
): { newError: boolean; confirmError: boolean } {
  return {
    newError: !isValidPassword(newPassword),
    confirmError: confirmPassword.trim() !== newPassword.trim(),
  };
}
