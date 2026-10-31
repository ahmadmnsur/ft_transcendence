import type { StudentRef } from '../students/student-ref';


export type DirectMessageView = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
};

export type ThreadView = {
  peer: StudentRef;
  lastMessage: DirectMessageView;
  unreadCount: number;
  canSend: boolean;
};

export type ThreadPage = { items: ThreadView[]; nextCursor: string | null };

export type PeerThread = {
  peer: StudentRef;
  canSend: boolean;
  items: DirectMessageView[];
  nextCursor: string | null;
};
