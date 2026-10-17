import type { EnGroup } from '../types';

export default {
  header: {
    navLabel: 'Account',
    profileLink: 'My profile',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    signOutFailed: 'Signing out failed. Try again.',
    signInLink: 'Sign in',
    signUpLink: 'Sign up',
  },
  language: { label: 'Language' },
  footer: { privacy: 'Privacy Policy', terms: 'Terms of Service' },
} as const satisfies EnGroup;
