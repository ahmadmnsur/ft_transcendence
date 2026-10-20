import { Refusal, type RefusalSpec } from '../core/errors';

// §6.15's Round and Match refusals, with the English sentence the SPA's
// dictionary also has. The SPA never displays these: it picks its own text by
// code (§6.15).

// The raw unique `round_single_open` → `round_already_open` (§3.6.2, §8.4):
// the backstop behind the open-Round read, so two racing opens commit one
// Round and the other writes nothing.
export const ROUND_ALREADY_OPEN: RefusalSpec = {
  code: 'round_already_open',
  message: 'A Round is already open.',
};

export function roundAlreadyOpen(): Refusal {
  return new Refusal(ROUND_ALREADY_OPEN.code, ROUND_ALREADY_OPEN.message);
}

export function noOpenRound(): Refusal {
  return new Refusal('no_open_round', 'No Round is open.');
}

// §8.6: distinctness is the `same_student` rule, not the DTO's shape check.
export function sameStudent(): Refusal {
  return new Refusal('same_student', "A Student can't be matched with themselves.");
}

// §8.6, §8.1: one of the two named Students is not a candidate — an Admin, a
// Suspended or Removed Student, or one who lists no Skill.
export function notACandidate(): Refusal {
  return new Refusal('not_a_candidate', 'This Student is not a candidate in this Round.');
}

// §8.6, ADR-0006 d10 as clarified: a manual Match requires both Students to
// be currently unmatched for the Round, whatever the row's standing status.
export function alreadyMatched(): Refusal {
  return new Refusal('already_matched', 'This Student already has a Match in this Round.');
}

// §8.6, ADR-0006 d10: a Block either way makes the pair unmatchable by an
// Admin exactly as it is by the algorithm.
export function pairBlocked(): Refusal {
  return new Refusal('pair_blocked', "These two Students can't be matched: one has blocked the other.");
}

// §8.5: accept on a Match that is no longer waiting for the actor's answer.
export function matchNotPending(): Refusal {
  return new Refusal('match_not_pending', 'This Match is no longer waiting for an answer.');
}

// §8.5: decline on a Match that is no longer MATCHED or ACCEPTED.
export function matchNotInProgress(): Refusal {
  return new Refusal('match_not_in_progress', 'This Match is not in progress.');
}
