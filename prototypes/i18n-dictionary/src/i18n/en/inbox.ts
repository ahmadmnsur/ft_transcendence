import type { EnGroup } from '../types';

export default {
  title: 'Inbox',
  unread: { one: '{count} unread message', other: '{count} unread messages' },
  sentYou: '{name} sent you a message',
} as const satisfies EnGroup;
