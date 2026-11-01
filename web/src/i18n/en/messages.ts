import type { EnGroup } from '../types';

export default {
  title: 'Direct Messages',
  list: {
    title: 'Your Direct Messages',
    subtitle: 'Only you see this list.',
    loading: 'Loading your Direct Messages…',
    emptyTitle: "You haven't exchanged any Direct Messages yet.",
    emptyDescription: "You can send one from a Student's profile.",
    showMore: 'Show more',
    yourMessage: 'You: {body}',
    unread: { one: '{count} unread', other: '{count} unread' },
  },
  page: {
    loading: 'Loading the Direct Messages…',
    heading: 'Direct Messages with {name}',
    emptyTitle: 'No Direct Message with {name} yet.',
    emptyDescription: 'Write the first one below.',
    composerLabel: 'Your message',
    send: 'Send',
    sending: 'Sending…',
    showEarlier: 'Show earlier messages',
    ownSender: 'You',
    empty: 'Write a message first.',
    tooLong: 'Keep the message within {limit} characters.',
    notConnected: "You're offline. Check your connection and try again.",
    mayHaveSaved: 'The message may have been sent. Check the messages above before you send it again.',
  },
  profile: {
    messageLink: 'Send a Direct Message',
  },
} as const satisfies EnGroup;
