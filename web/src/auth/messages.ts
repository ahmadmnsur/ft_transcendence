// The SPA never displays the server's `message`: it picks its own text by
// `code` from the map below, covering every code these screens can receive
// (§6.15). An unknown code or a non-envelope response shows the generic
// sentence. Every other user-visible string of these screens lives in
// `authCopy` beside it, so translating them later is a matter of swapping
// entries.
const GENERIC = 'Something went wrong. Try again.';

const MESSAGES: Record<string, string> = {
  no_account: 'No account uses this email.',
  password_incorrect: 'Wrong password.',
  account_removed: "This account was removed and can't sign in again.",
  account_suspended: 'Your account is suspended. Contact an Admin.',
  too_many_attempts: 'Too many attempts. Try again later.',
  busy_retry_later: 'The server is busy. Try again in a moment.',
  email_unavailable: 'This email is already in use.',
  already_signed_in: 'You are already signed in.',
  validation_failed: 'Check the highlighted fields and try again.',
};

export function authErrorMessage(code: unknown): string {
  if (typeof code === 'string' && MESSAGES[code] !== undefined) return MESSAGES[code];
  return GENERIC;
}

export const authCopy = {
  genericError: GENERIC,
  passwordVisibility: {
    showPasswordLabel: 'Show password',
    hidePasswordLabel: 'Hide password',
  },
  signIn: {
    title: 'Sign in',
    heading: 'Sign in',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    emailInvalid: 'Enter a valid email address.',
    passwordEmpty: 'Enter your password.',
    passwordInvalid: 'Use at least 8 characters and at most 72 bytes.',
    noAccountCta: 'No account yet?',
    signUpLink: 'Sign up',
    noticePasswordChanged: 'Your password was changed. Sign in with your new password.',
    noticeSignedOutUnknown:
      'You were signed out, and the password change may not have finished. Try your new password first, then your old one.',
    oauthButton: 'Sign in with 42',
    oauthFailed: 'Sign in with 42 failed. Try again.',
  },
  signUp: {
    title: 'Sign up',
    heading: 'Create your account',
    emailLabel: 'Email',
    emailHint: 'Used only to sign in. Never shown to other Students.',
    emailInvalid: 'Enter a valid email address.',
    displayNameLabel: 'Display name',
    displayNameHint: '1–40 characters. Shown to every signed-in Student.',
    displayNameInvalid: 'Enter a display name of 1–40 characters.',
    passwordLabel: 'Password',
    passwordHint: 'At least 8 characters, at most 72 bytes. No other rules.',
    passwordInvalid: 'Use at least 8 characters and at most 72 bytes.',
    confirmPasswordLabel: 'Confirm password',
    confirmPasswordEmpty: 'Enter your password again.',
    confirmPasswordMismatch: 'Passwords do not match. Enter the same password in both fields.',
    confirmPasswordVisibility: {
      showPasswordLabel: 'Show confirmation password',
      hidePasswordLabel: 'Hide confirmation password',
    },
    acceptTermsLabel: 'I agree to the Terms of Service and have read the Privacy Policy',
    acceptTermsLinksPrefix: 'Read the full text:',
    termsLink: 'Terms of Service',
    privacyLink: 'Privacy Policy',
    acceptTermsInvalid: 'You need to accept the Terms and read the Policy to sign up.',
    submit: 'Sign up',
    submitting: 'Signing up…',
    haveAccountCta: 'Already have an account?',
    signInLink: 'Sign in',
  },
  passwordChange: {
    title: 'My profile',
    heading: 'My profile',
    cardTitle: 'Change password',
    cardSubtitle: 'Changing your password signs you out everywhere.',
    currentLabel: 'Current password',
    currentEmpty: 'Enter your current password.',
    currentInvalid: 'Use at least 8 characters and at most 72 bytes.',
    newLabel: 'New password',
    newHint: 'At least 8 characters, at most 72 bytes. No other rules.',
    newInvalid: 'Use at least 8 characters and at most 72 bytes.',
    confirmLabel: 'Confirm the new password',
    confirmInvalid: 'The two new passwords do not match.',
    submit: 'Change password',
    submitting: 'Changing…',
  },
  header: {
    brand: '42 PeerConnect',
    navLabel: 'Account',
    profileLink: 'My profile',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    signOutFailed: 'Signing out failed. Try again.',
    signInLink: 'Sign in',
    signUpLink: 'Sign up',
  },
} as const;
