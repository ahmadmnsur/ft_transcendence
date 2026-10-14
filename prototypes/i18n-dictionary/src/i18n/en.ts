import type { ErrorCode } from '../codes';
import type { EnGroup } from './types';

export default {
  nav: { privacy: 'Privacy Policy', terms: 'Terms of Service' },
  inbox: {
    title: 'Inbox',
    unread: { one: '{count} unread message', other: '{count} unread messages' },
    sentYou: '{name} sent you a message',
  },
  errors: {
    validation_failed: 'Check the highlighted fields.',
    not_found: 'This was not found.',
    internal_error: 'Something went wrong.',
  } satisfies Record<ErrorCode, string>,
  insights: {
    gapSome: {
      text: '{demand} to learn {skill}; {supply} it.',
      parts: {
        demand: { one: '{count} Student wants', other: '{count} Students want' },
        supply: { one: 'only {count} can teach', other: 'only {count} can teach' },
      },
    },
  },
} as const satisfies EnGroup;
