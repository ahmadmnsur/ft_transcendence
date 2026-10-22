import type { PrismaTx } from '../core/uow';

// The Mentee of a Review's Match, the one Student who writes its Evidence
// (§9.4), or null for an unknown Review. The route's pre-check reads it
// outside any transaction, and the save and the delete again inside theirs.
export async function reviewMenteeId(db: PrismaTx, reviewId: string): Promise<string | null> {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { match: { select: { menteeId: true } } },
  });
  return review?.match.menteeId ?? null;
}
