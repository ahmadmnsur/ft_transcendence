import type { EnGroup } from '../types';

// `/friends` and the Block control on a profile (§6.4, §11.2, §11.3). A
// failed read or write shows the errors area's sentence for its code, and a
// Removed Student's name is people's tombstone.
export default {
  friends: {
    title: 'Friends',
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
