import { Refusal, type RefusalSpec } from '../core/errors';

// §12.2: one refusal for every invalid target, without revealing its state.
export function reportTargetInvalid(): Refusal {
  return new Refusal('report_target_invalid', "This can't be reported.");
}

// §3.6.2, ADR-0011 d5: either partial unique refuses a lifetime duplicate.
export const ALREADY_REPORTED: RefusalSpec = {
  code: 'already_reported',
  message: 'You have already reported this.',
};

// §12.5, ADR-0011 d6: the group has no open row now; an earlier resolution
// won, and this one changes nothing.
export function alreadyResolved(): Refusal {
  return new Refusal('already_resolved', 'This Report was already resolved.');
}

// §12.5, ADR-0011 d7 and d9: the actor's own interest in the group, read at
// the action's serialization point.
export function conflictOfInterest(): Refusal {
  return new Refusal('conflict_of_interest', "You can't resolve a Report that concerns you.");
}
