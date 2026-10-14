import type inbox from '../en/inbox';
import type { Catalogue } from '../types';

export default {
  title: 'Boîte de réception',
  unread: { one: '{count} message non lu', many: '{count} de messages non lus', other: '{count} messages non lus' },
  sentYou: '{name} vous a envoyé un message',
} as const satisfies Catalogue<'fr', typeof inbox>;
