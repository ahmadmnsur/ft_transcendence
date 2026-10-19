import type { StudentRef } from '../students/student-ref';

// §6.4's wire shapes, exact field names: the SPA depends on them.

// One of the actor's own Blocks: the blocked Student and when the Block was
// set. A Removed Student shows as the tombstone (§6.0.1), so a Block set
// before a Removal can still be lifted.
export type BlockView = { student: StudentRef; createdAt: string };

// One accepted Friend: the other Student and whether they are online now (the
// Presence registry, §7.6). A Removed Student never appears (§11.1).
export type FriendView = { student: StudentRef; online: boolean };

// One pending request, from the actor's side: `student` is the other party,
// the requester of an incoming request or the addressee of an outgoing one.
export type FriendRequestView = { id: string; student: StudentRef; createdAt: string };

export type FriendRequestLists = { incoming: FriendRequestView[]; outgoing: FriendRequestView[] };
