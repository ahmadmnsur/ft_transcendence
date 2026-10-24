import type { EnGroup } from '../types';

export default {
  skipLink: 'Skip to main content',
  pageTitle: '{page} · {brand}',
  header: {
    navLabel: 'Main menu',
    studentsLink: 'Students',
    friendsLink: 'Friends',
    messagesLink: 'Direct Messages',
    matchLink: 'Match',
    // Shown to Admins only: their Round pages (§3.5.1).
    roundsLink: 'Rounds',
    // Shown to Admins only: the Users table (§3.5.1).
    usersLink: 'Users',
    // Shown to Peer Moderators only: their queue (§3.5.1).
    moderationLink: 'Moderation',
    // Shown to Admins only: the open queue and the resolved audit (§3.5.1).
    reportsLink: 'Reports',
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
  originRefused: {
    title: "This address can't reach {brand}",
    body: 'Open {brand} at the address it was set up with.',
  },
} as const satisfies EnGroup;
