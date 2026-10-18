import type { EnGroup } from '../types';

export default {
  skipLink: 'Skip to main content',
  pageTitle: '{page} · {brand}',
  header: {
    navLabel: 'Main menu',
    studentsLink: 'Students',
    profileLink: 'My profile',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    signOutFailed: 'Signing out failed. Try again.',
    signInLink: 'Sign in',
    signUpLink: 'Sign up',
  },
  language: { label: 'Language' },
  footer: { privacy: 'Privacy Policy', terms: 'Terms of Service' },
  notFound: {
    name: 'Page not found',
    title: 'This page does not exist.',
    description: 'Check that the address is right, or go back home.',
    homeLink: 'Back to home',
  },
  error: {
    name: 'Something went wrong',
    title: 'This page could not be shown.',
    description: 'Try again in a moment.',
    retry: 'Try again',
  },
} as const satisfies EnGroup;
