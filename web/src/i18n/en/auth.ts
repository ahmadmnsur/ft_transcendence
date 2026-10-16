import type { EnGroup } from '../types';

export default {
  password: {
    hint: {
      text: '{minChars}, {maxBytes}. No other rules.',
      parts: {
        minChars: { one: 'At least {count} character', other: 'At least {count} characters' },
        maxBytes: { one: 'at most {count} byte', other: 'at most {count} bytes' },
      },
    },
    invalid: {
      text: 'Use {minChars} and {maxBytes}.',
      parts: {
        minChars: { one: 'at least {count} character', other: 'at least {count} characters' },
        maxBytes: { one: 'at most {count} byte', other: 'at most {count} bytes' },
      },
    },
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
    noAccount: 'No account yet? {link}',
    signUpLink: 'Sign up',
    noticePasswordChanged: 'Your password was changed. Sign in with your new password.',
    noticeSignedOutUnknown:
      'You were signed out, and the password change may not have finished. Try your new password first, then your old one.',
  },
  signUp: {
    title: 'Sign up',
    heading: 'Create your account',
    emailLabel: 'Email',
    emailHint: 'Used only to sign in. Never shown to other Students.',
    emailInvalid: 'Enter a valid email address.',
    displayNameLabel: 'Display name',
    displayNameHint: {
      one: '{minChars}–{count} character. Shown to every signed-in Student.',
      other: '{minChars}–{count} characters. Shown to every signed-in Student.',
    },
    displayNameInvalid: {
      one: 'Enter a display name of {minChars}–{count} character.',
      other: 'Enter a display name of {minChars}–{count} characters.',
    },
    passwordLabel: 'Password',
    acceptTermsLabel: 'I agree to the Terms of Service and have read the Privacy Policy',
    readFullText: 'Read the full text: {termsLink} · {privacyLink}',
    termsLink: 'Terms of Service',
    privacyLink: 'Privacy Policy',
    acceptTermsInvalid: 'You need to accept the Terms and read the Policy to sign up.',
    submit: 'Sign up',
    submitting: 'Signing up…',
    haveAccount: 'Already have an account? {link}',
    signInLink: 'Sign in',
  },
  passwordChange: {
    title: 'My profile',
    heading: 'My profile',
    cardTitle: 'Change password',
    cardSubtitle: 'Changing your password signs you out everywhere.',
    currentLabel: 'Current password',
    currentEmpty: 'Enter your current password.',
    newLabel: 'New password',
    confirmLabel: 'Confirm the new password',
    confirmInvalid: 'The two new passwords do not match.',
    submit: 'Change password',
    submitting: 'Changing…',
  },
} as const satisfies EnGroup;
