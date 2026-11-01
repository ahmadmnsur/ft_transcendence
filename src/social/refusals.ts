import { Refusal, type RefusalSpec } from '../core/errors';


export function selfActionForbidden(): Refusal {
  return new Refusal('self_action_forbidden', "You can't do this to your own account.");
}

export function studentRemoved(): Refusal {
  return new Refusal('student_removed', 'This Student was removed.');
}

export function notBlocked(): Refusal {
  return new Refusal('not_blocked', 'This Student is not blocked.');
}

export const ALREADY_BLOCKED: RefusalSpec = {
  code: 'already_blocked',
  message: 'You have already blocked this Student.',
};

export function friendRequestUnavailable(): Refusal {
  return new Refusal('friend_request_unavailable', "You can't send a friend request to this Student.");
}

export function friendshipExists(): Refusal {
  return new Refusal('friendship_exists', FRIENDSHIP_EXISTS.message);
}

export function requestNotPending(): Refusal {
  return new Refusal('request_not_pending', 'This friend request is no longer waiting for an answer.');
}

export function notFriends(): Refusal {
  return new Refusal('not_friends', 'You are not Friends.');
}

export const FRIENDSHIP_EXISTS: RefusalSpec = {
  code: 'friendship_exists',
  message: 'You are already Friends, or a request is already waiting.',
};
