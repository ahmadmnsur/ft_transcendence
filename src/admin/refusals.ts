import { Refusal } from '../core/errors';


export function studentRemoved(): Refusal {
  return new Refusal('student_removed', 'This Student was removed.');
}

export function selfActionForbidden(): Refusal {
  return new Refusal('self_action_forbidden', "You can't do this to your own account.");
}

export function lastActiveAdmin(): Refusal {
  return new Refusal('last_active_admin', 'There must always be at least one active Admin.');
}

export function alreadySuspended(): Refusal {
  return new Refusal('already_suspended', 'This Student is already suspended.');
}

export function notSuspended(): Refusal {
  return new Refusal('not_suspended', 'This Student is not suspended.');
}
