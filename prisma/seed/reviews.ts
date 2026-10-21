import type { Actor } from '../../src/core/actor';
import type { MatchDetailView } from '../../src/matching/views';
import type { ReviewsService } from '../../src/reviews/reviews.service';
import type { ReviewInput } from '../../src/reviews/views';
import type { SkillView } from '../../src/students/views';

// §14.5's ratings, by k mod 8; null leaves the Private Feedback unrated.
const RATINGS = [5, 4, 5, 3, null, 4, 5, 2] as const;

// The {Skill} of a Match whose FORWARD set is empty, as a hand-made repair's
// may be (§8.6).
const NO_SKILL = 'a new topic';

// §14.5's Review with submission order k. All four sentences name one Skill:
// the FORWARD Skill that sorts first by name, compared by code point, the
// hosted database's C.UTF-8 order. The fallback's database sorts
// linguistically (§4.4 step 9) and puts "Sockets" before "SQL", so the order
// is fixed here rather than read from the database.
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

// The Mentee's Review of a Match both sides accepted, from the Mentee's own
// view of it, whose FORWARD Skills are what the Mentee gained.
export type SubmitReview = (mentee: Actor, menteeView: MatchDetailView) => Promise<void>;

// One script for the whole seed: k counts every Review submitted so far, a
// repair's at step d, then step h's in selection order, across all four Rounds.
export function submitReviewsInOrder(reviews: ReviewsService): SubmitReview {
  let k = 0;
  return async (mentee, menteeView) => {
    await reviews.submitReview(mentee, menteeView.id, reviewInput(k, menteeView.coverage.forward));
    k += 1;
  };
}
