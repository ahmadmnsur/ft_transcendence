import type { StudentRef } from '../students/student-ref';


export type BlockView = { student: StudentRef; createdAt: string };

export type FriendView = { student: StudentRef; online: boolean };

export type FriendRequestView = { id: string; student: StudentRef; createdAt: string };

export type FriendRequestLists = { incoming: FriendRequestView[]; outgoing: FriendRequestView[] };
