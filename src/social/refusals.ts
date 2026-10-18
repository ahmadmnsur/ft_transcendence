import { Refusal, type RefusalSpec } from '../core/errors';

// §6.4's Block refusals, with the English sentence the SPA's dictionary also
// has. The SPA never displays these: it picks its own text by code (§6.15).

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
