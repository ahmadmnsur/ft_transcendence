import { Refusal, type RefusalSpec } from '../core/errors';


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

export function sameStudent(): Refusal {
  return new Refusal('same_student', "A Student can't be matched with themselves.");
}

export function notACandidate(): Refusal {
  return new Refusal('not_a_candidate', 'This Student is not a candidate in this Round.');
}

export function alreadyMatched(): Refusal {
  return new Refusal('already_matched', 'This Student already has a Match in this Round.');
}

export function pairBlocked(): Refusal {
  return new Refusal('pair_blocked', "These two Students can't be matched: one has blocked the other.");
}

export function matchNotPending(): Refusal {
  return new Refusal('match_not_pending', 'This Match is no longer waiting for an answer.');
}

export function matchNotInProgress(): Refusal {
  return new Refusal('match_not_in_progress', 'This Match is not in progress.');
}
