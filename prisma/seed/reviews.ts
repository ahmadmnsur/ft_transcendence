import type { Actor } from '../../src/core/actor';
import type { MatchDetailView } from '../../src/matching/views';
import type { ReviewsService } from '../../src/reviews/reviews.service';
import type { ReviewInput } from '../../src/reviews/views';
import type { SkillView } from '../../src/students/views';

const RATINGS = [5, 4, 5, 3, null, 4, 5, 2] as const;

const NO_SKILL = 'a new topic';

function reviewInput(k: number, forward: readonly SkillView[]): ReviewInput {
  const skill = forward.map((item) => item.name).sort()[0] ?? NO_SKILL;
  const rating = RATINGS[k % RATINGS.length];
  return {
    learningOutcome: {
      learned: `How ${skill} works in practice.`,
      canNowDo: `I can use ${skill} on my own project.`,
    },
    privateFeedback: {
      answerUsefulness: `Very useful — we covered ${skill} end to end.`,
      answerExplanation: 'Clear explanations; more worked examples would help.',
      ...(rating === null ? {} : { rating }),
    },
    publicTakeaway: `Learned ${skill} with a peer this Round.`,
  };
}

export type SubmitReview = (mentee: Actor, menteeView: MatchDetailView) => Promise<void>;

export function submitReviewsInOrder(reviews: ReviewsService): SubmitReview {
  let k = 0;
  return async (mentee, menteeView) => {
    await reviews.submitReview(mentee, menteeView.id, reviewInput(k, menteeView.coverage.forward));
    k += 1;
  };
}
