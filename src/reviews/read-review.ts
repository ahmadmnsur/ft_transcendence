import type { PrismaTx } from '../core/uow';
import type { ReviewDetail } from './views';

// Call only after authorizing the Match's pair or an Admin. All fields come
// from the caller's snapshot, so a concurrent submission is seen whole.
export async function readReview(tx: PrismaTx, matchId: string): Promise<ReviewDetail> {
  const row = await tx.review.findUnique({
    where: { matchId },
    select: {
      id: true,
      learned: true,
      canNowDo: true,
      createdAt: true,
      privateFeedback: {
        select: { answerUsefulness: true, answerExplanation: true, rating: true, createdAt: true },
      },
      evidence: { select: { token: true, mime: true, size: true, filename: true } },
    },
  });
  if (row === null) return { review: null, privateFeedback: null };
  const feedback = row.privateFeedback;
  return {
    review: {
      id: row.id,
      learned: row.learned,
      canNowDo: row.canNowDo,
      createdAt: row.createdAt.toISOString(),
      evidence: row.evidence,
    },
    privateFeedback: feedback === null ? null : { ...feedback, createdAt: feedback.createdAt.toISOString() },
  };
}
