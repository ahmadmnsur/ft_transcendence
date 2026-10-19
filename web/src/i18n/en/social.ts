import type { EnGroup } from '../types';

// `/friends` and the friend and Block controls on a profile (§6.4, §11.1–
// §11.3). A failed read or write shows the errors area's sentence for its
// code, and a Removed Student's name is people's tombstone.
export default {
  friends: {
    title: 'Friends',
  },
  // The friend actions both screens share, and what they report.
  friendActions: {
    send: 'Send friend request',
    sending: 'Sending…',
    accept: 'Accept',
    accepting: 'Accepting…',
    decline: 'Decline',
    declining: 'Declining…',
    cancelRequest: 'Cancel request',
    cancelling: 'Cancelling…',
    end: 'End Friendship',
    ending: 'Ending…',
    sent: 'You sent {name} a friend request.',
    accepted: 'You and {name} are now Friends.',
    declined: 'You declined the friend request from {name}.',
    cancelled: 'You cancelled your friend request to {name}.',
    ended: 'You ended your Friendship with {name}.',
    // Accept refused `friend_request_unavailable` (the other Student was
    // Removed meanwhile): the errors area's sentence speaks of sending.
    acceptUnavailable: 'You can no longer accept this friend request.',
  },
  // §11.1: ending a Friendship asks first, since only a new request restores it.
  endConfirm: {
    title: 'End your Friendship with {name}?',
    body: "You will both stop seeing whether the other is online, and {name} will leave your Friends, as you will leave theirs. To be Friends again, one of you will need to send a new friend request.",
    keep: 'Keep Friendship',
  },
  // §7.6: a Friend's Presence, as text beside a dot, never colour alone.
  presence: {
    online: 'Online',
    offline: 'Offline',
  },
  // The friend control on another Student's profile.
  friendProfile: {
    friendsNote: 'You are Friends.',
    outgoingNote: 'You sent this Student a friend request.',
    incomingNote: 'This Student sent you a friend request.',
  },
  // The Friends list on `/friends`.
  friendList: {
    title: 'Your Friends',
    subtitle: 'Only you see this list. Your Friends see whether you are online.',
    loading: 'Loading your Friends…',
    emptyTitle: "You don't have any Friends yet.",
    emptyDescription: "You can send a friend request from a Student's profile.",
    // Each row's End Friendship button; it starts with the visible text.
    endNamed: 'End Friendship with {name}',
  },
  // The friend requests on `/friends`.
  requests: {
    title: 'Friend requests',
    subtitle: 'A request is seen only by you and the other Student.',
    loading: 'Loading your friend requests…',
    incomingTitle: 'Received',
    outgoingTitle: 'Sent',
    incomingEmpty: 'No friend request is waiting for your answer.',
    outgoingEmpty: 'No request you sent is waiting.',
    receivedOn: 'Received on {date}',
    sentOn: 'Sent on {date}',
    // Each row's buttons; every name starts with the visible text.
    acceptNamed: 'Accept the friend request from {name}',
    declineNamed: 'Decline the friend request from {name}',
    cancelNamed: 'Cancel request to {name}',
  },
  // The Block actions both screens share, and what they report.
  actions: {
    block: 'Block',
    blocking: 'Blocking…',
    unblock: 'Unblock',
    unblocking: 'Unblocking…',
    cancel: 'Cancel',
    retry: 'Try again',
    blocked: 'You blocked {name}.',
    // §11.3: lifting a Block restores nothing.
    unblocked: 'You unblocked {name}. If you were Friends before the Block, you will need to send a new friend request.',
    // A Removed Student can get no friend request, so this one gives no advice.
    unblockedRemoved: 'You unblocked {name}.',
  },
  // The Block control on another Student's profile.
  profile: {
    blockedNote: 'You blocked this Student.',
    confirmTitle: 'Block {name}?',
    // §11.2: what a Block does, and that the other Student is not told.
    confirmBody:
      "Neither of you will be able to send the other a friend request or a Direct Message, and you won't be matched together. If you are Friends, or a friend request is waiting, that ends too. A Match already in progress stays. {name} is not told.",
    confirm: 'Block',
  },
  // The Blocks list on `/friends`.
  blocks: {
    title: 'Blocks',
    subtitle: 'Only you see this list. A Student you block is not told.',
    // While `GET /api/blocks` is pending, the card shows this sentence.
    loading: 'Loading your Blocks…',
    emptyTitle: "You haven't blocked anyone.",
    emptyDescription: 'You can block a Student from their profile.',
    blockedOn: 'Blocked on {date}',
    // The accessible name of each row's Unblock button. It starts with the
    // button's visible text, so a voice command naming that text still works.
    unblockNamed: 'Unblock {name}',
  },
} as const satisfies EnGroup;
