import type { EnGroup } from '../types';

export default {
  skipLink: 'Skip to main content',
  pageTitle: '{page} · {brand}',
  header: {
    newLabel: '{label}, new',
    navLabel: 'Main menu',
    menu: 'Menu',
    accountMenu: 'Account menu',
    accountMenuNamed: 'Account menu {name}',
    adminLink: 'Admin tools',
    studentsLink: 'Students',
    friendsLink: 'Friends',
    messagesLink: 'Direct Messages',
    matchLink: 'Match',
    moderationLink: 'Moderation',
    profileLink: 'My profile',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    signOutFailed: 'Signing out failed. Try again.',
    signInLink: 'Sign in',
    signUpLink: 'Sign up',
  },
  language: { label: 'Language' },
  theme: { toDark: 'Switch to dark theme', toLight: 'Switch to light theme' },
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
  originRefused: {
    title: "This address can't reach {brand}",
    body: 'Open {brand} at the address it was set up with.',
  },
} as const satisfies EnGroup;
