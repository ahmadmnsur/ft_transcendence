import type { EnGroup } from '../types';

export default {
  skipLink: 'Skip to main content',
  pageTitle: '{page} · {brand}',
  header: {
    navLabel: 'Main menu',
    // The phone-width button that shows every link, and the wider screens'
    // button, named by the signed-in Student, that holds their own pages.
    menu: 'Menu',
    accountMenu: 'Account menu',
    // Shown to Admins only: `/admin`, which links each Admin page (§3.5.1).
    adminLink: 'Admin tools',
    studentsLink: 'Students',
    friendsLink: 'Friends',
    messagesLink: 'Direct Messages',
    matchLink: 'Match',
    // Shown to Peer Moderators only: their queue (§3.5.1).
    moderationLink: 'Moderation',
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
