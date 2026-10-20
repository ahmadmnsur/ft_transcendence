import type { EnGroup } from '../types';

// §6.5, §7.3 and §7.4's screens: the threads list on `/messages`, one
// peer's page on `/messages/$peerId`, its composer, and the control on a
// profile. The product's word is Direct Message: the screens never say
// conversation, thread or chat (CONTEXT.md's Direct Message entry).
export default {
  title: 'Direct Messages',
  list: {
    title: 'Your Direct Messages',
    subtitle: 'Only you see this list.',
    loading: 'Loading your Direct Messages…',
    emptyTitle: "You haven't exchanged any Direct Messages yet.",
    emptyDescription: "You can send one from a Student's profile.",
    showMore: 'Show more',
    // The preview of a message this viewer sent.
    yourMessage: 'You: {body}',
    unread: { one: '{count} unread', other: '{count} unread' },
  },
  page: {
    loading: 'Loading the Direct Messages…',
    // The page's and the browser tab's heading: the thread is one peer's
    // Direct Messages.
    heading: 'Direct Messages with {name}',
    emptyTitle: 'No Direct Message with {name} yet.',
    emptyDescription: 'Write the first one below.',
    composerLabel: 'Your message',
    send: 'Send',
    sending: 'Sending…',
    showEarlier: 'Show earlier messages',
    // The visually hidden sender of one of the viewer's own messages, so a
    // screen reader hears who sent it; the other side's is the peer's name.
    ownSender: 'You',
    empty: 'Write a message first.',
    tooLong: 'Keep the message within {limit} characters.',
    notConnected: "You're offline. Check your connection and try again.",
    // The messages sit above the composer, where a resend begins.
    mayHaveSaved: 'The message may have been sent. Check the messages above before you send it again.',
  },
  profile: {
    messageLink: 'Send a Direct Message',
  },
} as const satisfies EnGroup;
