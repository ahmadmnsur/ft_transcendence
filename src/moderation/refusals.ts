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
