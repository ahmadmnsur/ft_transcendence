import { Refusal } from '../core/errors';

// §6.15's Users-table refusals (§12.7), with the English sentence the SPA's
// dictionary also has. The SPA never displays these: it picks its own text by
// code (§6.15).

// A Removed Student is view-only (ADR-0008 d8's note of 2026-09-21).
export function studentRemoved(): Refusal {
  return new Refusal('student_removed', 'This Student was removed.');
}

// An Admin never changes their own role, suspends or removes themselves
// (ADR-0008 d9).
export function selfActionForbidden(): Refusal {
  return new Refusal('self_action_forbidden', "You can't do this to your own account.");
}

// The action would leave no active Admin (ADR-0008 d9 and its note of
// 2026-09-21).
export function lastActiveAdmin(): Refusal {
  return new Refusal('last_active_admin', 'There must always be at least one active Admin.');
}
