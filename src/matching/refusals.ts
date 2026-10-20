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

// §8.5: accept on a Match that is no longer waiting for the actor's answer.
export function matchNotPending(): Refusal {
  return new Refusal('match_not_pending', 'This Match is no longer waiting for an answer.');
}

// §8.5: decline on a Match that is no longer MATCHED or ACCEPTED.
export function matchNotInProgress(): Refusal {
  return new Refusal('match_not_in_progress', 'This Match is not in progress.');
}
