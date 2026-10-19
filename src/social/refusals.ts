import { Refusal, type RefusalSpec } from '../core/errors';

// §6.4's Friends and Block refusals, with the English sentence the SPA's
// dictionary also has. The SPA never displays these: it picks its own text by
// code (§6.15).

export function selfActionForbidden(): Refusal {
  return new Refusal('self_action_forbidden', "You can't do this to your own account.");
}

export function studentRemoved(): Refusal {
  return new Refusal('student_removed', 'This Student was removed.');
}

export function notBlocked(): Refusal {
  return new Refusal('not_blocked', 'This Student is not blocked.');
}

// The unique index on (blocker_id, blocked_id) → `already_blocked` (§3.6.2):
// a second Block of the same Student, a double click included, is refused
// with nothing written.
export const ALREADY_BLOCKED: RefusalSpec = {
  code: 'already_blocked',
  message: 'You have already blocked this Student.',
};

// §6.4: a Block between the pair, either way, or a Removed requester at
// accept. One sentence whoever blocked, so the other Student is not told.
export function friendRequestUnavailable(): Refusal {
  return new Refusal('friend_request_unavailable', "You can't send a friend request to this Student.");
}

export function friendshipExists(): Refusal {
  return new Refusal('friendship_exists', FRIENDSHIP_EXISTS.message);
}

// §6.4: accept, decline or cancel on a request that is gone (the other party
// cancelled, declined or blocked first), was never the actor's to answer, or
// is no longer pending. A hard-deleted row is indistinguishable from an
// unknown one, so all of them get this one code.
export function requestNotPending(): Refusal {
  return new Refusal('request_not_pending', 'This friend request is no longer waiting for an answer.');
}

export function notFriends(): Refusal {
  return new Refusal('not_friends', 'You are not Friends.');
}

// The raw unique `friendship_unordered_pair` → `friendship_exists` (§3.6.2):
// two opposite requests racing, or a double click, admit one row, and the
// loser writes nothing.
export const FRIENDSHIP_EXISTS: RefusalSpec = {
  code: 'friendship_exists',
  message: 'You are already Friends, or a request is already waiting.',
};
