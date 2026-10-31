import type { PrismaTx } from '../core/uow';

export async function reviewMenteeId(db: PrismaTx, reviewId: string): Promise<string | null> {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { match: { select: { menteeId: true } } },
  });
  return review?.match.menteeId ?? null;
}
