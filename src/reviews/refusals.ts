import { Refusal, type RefusalSpec } from '../core/errors';

export const ALREADY_REVIEWED: RefusalSpec = {
  code: 'already_reviewed',
  message: 'You already reviewed this Match.',
};

export function alreadyReviewed(): Refusal {
  return new Refusal(ALREADY_REVIEWED.code, ALREADY_REVIEWED.message);
}

export function matchNotReviewable(): Refusal {
  return new Refusal('match_not_reviewable', 'This Match cannot be reviewed.');
}
