// The texts #168 and #170 added while the dictionary was being built. They
// stay in English here until they move into web/src/i18n/.
export const authCopy = {
  passwordVisibility: {
    showPasswordLabel: 'Show password',
    hidePasswordLabel: 'Hide password',
  },
  signIn: {
    oauthButton: 'Sign in with 42',
    oauthFailed: 'Sign in with 42 failed. Try again.',
  },
  signUp: {
    confirmPasswordLabel: 'Confirm password',
    confirmPasswordEmpty: 'Enter your password again.',
    confirmPasswordMismatch: 'Passwords do not match. Enter the same password in both fields.',
    confirmPasswordVisibility: {
      showPasswordLabel: 'Show confirmation password',
      hidePasswordLabel: 'Hide confirmation password',
    },
  },
} as const;
