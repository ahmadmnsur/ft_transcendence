import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork } from '../core/uow';
import { awardMatchXp } from '../gamification/awards';
import { roundNumbers } from '../matching/match-views';
import { readActiveActor } from '../students/profile-writes';
import { STUDENT_REF_SELECT, toStudentRef } from '../students/student-ref';
import { feedbackReceivedWhere } from './feedback-received';
import { ALREADY_REVIEWED, alreadyReviewed, matchNotReviewable } from './refusals';
import type { FeedbackPage, ReviewInput, SubmitReviewResult } from './views';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly publisher: RealtimePublisher,
  ) {}

  async submitReview(actor: Actor, matchId: string, input: ReviewInput): Promise<SubmitReviewResult> {
    return this.uow.run(
      { name: 'review-submit', uniqueRefusals: { Review_match_id_key: ALREADY_REVIEWED } },
      async (tx, ctx) => {
        await readActiveActor(tx, actor.studentId);
        const match = await tx.match.findUnique({
          where: { id: matchId },
          select: { id: true, mentorId: true, menteeId: true, status: true },
        });
        if (match === null || (match.mentorId !== actor.studentId && match.menteeId !== actor.studentId)) {
          throw new ApiError('not_found');
        }
        if (match.mentorId === actor.studentId) throw new ApiError('forbidden');
        if (match.status === 'COMPLETED') throw alreadyReviewed();
        if (match.status !== 'ACCEPTED') throw matchNotReviewable();
        await tx.student.findUniqueOrThrow({
          where: { id: match.mentorId },
          select: { id: true, suspendedAt: true, removedAt: true },
        });
        const author = await tx.student.findUniqueOrThrow({
          where: { id: actor.studentId },
          select: STUDENT_REF_SELECT,
        });
        await ctx.checkpoint('review.submit');

        const review = await tx.review.create({
          data: {
            matchId,
            learned: input.learningOutcome.learned,
            canNowDo: input.learningOutcome.canNowDo,
            createdAt: ctx.now,
            privateFeedback: { create: { ...input.privateFeedback, createdAt: ctx.now } },
          },
          select: { id: true },
        });
        const post = await tx.post.create({
          data: {
            reviewId: review.id,
            authorId: actor.studentId,
            body: input.publicTakeaway,
            createdAt: ctx.now,
          },
          select: { id: true, body: true, createdAt: true },
        });
        await tx.match.update({ where: { id: matchId }, data: { status: 'COMPLETED' } });
        const earned = await awardMatchXp(tx, match.mentorId, match.menteeId, ctx.now);
        const item = {
          id: post.id,
          origin: 'TAKEAWAY',
          author: toStudentRef(author),
          body: post.body,
          createdAt: post.createdAt.toISOString(),
          likeCount: 0,
          likedByMe: false,
        };
        ctx.afterCommit(() => this.publisher.postCreated(item));
        ctx.afterCommit(() => this.publisher.matchChanged([match.mentorId, match.menteeId]));
        return { reviewId: review.id, postId: post.id, ...earned };
      },
    );
  }

  async listFeedbackReceived(actor: Actor, page: number, pageSize: number): Promise<FeedbackPage> {
    return this.uow.readOnly(async (tx) => {
      const where = feedbackReceivedWhere(actor.studentId);
      const total = await tx.privateFeedback.count({ where });
      const skip = (page - 1) * pageSize;
      if (skip >= total) return { items: [], total };
      const rows = await tx.privateFeedback.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          answerUsefulness: true,
          answerExplanation: true,
          rating: true,
          createdAt: true,
          review: {
            select: {
              match: { select: { id: true, roundId: true, mentee: { select: STUDENT_REF_SELECT } } },
            },
          },
        },
      });
      const numbers = await roundNumbers(tx);
      return {
        total,
        items: rows.map(({ review: { match }, ...feedback }) => ({
          ...feedback,
          createdAt: feedback.createdAt.toISOString(),
          matchId: match.id,
          roundNumber: numbers.get(match.roundId) ?? 0,
          author: toStudentRef(match.mentee),
        })),
      };
    });
  }
}
