import { Refusal, type RefusalSpec } from '../core/errors';

export function reportTargetInvalid(): Refusal {
  return new Refusal('report_target_invalid', "This can't be reported.");
}

export const ALREADY_REPORTED: RefusalSpec = {
  code: 'already_reported',
  message: 'You have already reported this.',
};

export function alreadyResolved(): Refusal {
  return new Refusal('already_resolved', 'This Report was already resolved.');
}

export function conflictOfInterest(): Refusal {
  return new Refusal('conflict_of_interest', "You can't resolve a Report that concerns you.");
}
