import type { StudentRef } from '../students/student-ref';

// §6.5 and §7.3's wire shapes, exact field names: the SPA depends on them.

// One Direct Message, either direction. `read_at` is deliberately absent
// (§11.4): a recipient's marking read sends no event, so nobody is ever told
// when their own sent message was read, and this same value is the ack's
// `data`, the `dm:message` payload and a thread-page item.
export type DirectMessageView = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
};

// One row of `GET /api/messages/threads` (§6.5): the peer, the pair's last
// message in either direction, the actor's unread count for it, and whether
// composing is available right now.
export type ThreadView = {
  peer: StudentRef;
  lastMessage: DirectMessageView;
  unreadCount: number;
  canSend: boolean;
};

// §6.5's `{ items, nextCursor }`: 50 rows per page, the cursor of §6.0.1.
export type ThreadPage = { items: ThreadView[]; nextCursor: string | null };

// `GET /api/messages/threads/:peerId` (§6.5): the peer, whether composing is
// available right now, and one page of the pair's two directions, newest
// first. Both directions interleave on one page, oldest to newest in the SPA.
export type PeerThread = {
  peer: StudentRef;
  canSend: boolean;
  items: DirectMessageView[];
  nextCursor: string | null;
};
