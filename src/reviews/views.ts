import type { StudentRef } from '../students/student-ref';

export type ReviewInput = {
  learningOutcome: { learned: string; canNowDo: string };
  privateFeedback: { answerUsefulness: string; answerExplanation: string; rating?: number };
  publicTakeaway: string;
};

export type PrivateFeedbackView = {
  answerUsefulness: string;
  answerExplanation: string;
  rating: number | null;
  createdAt: string;
};

export type ReviewDetail = {
  review: { id: string; learned: string; canNowDo: string; createdAt: string } | null;
  privateFeedback: PrivateFeedbackView | null;
};

// XP and the earn panel join in #57.
export type SubmitReviewResult = { reviewId: string; postId: string };
export type FeedbackItem = PrivateFeedbackView & { matchId: string; roundNumber: number; author: StudentRef };
export type FeedbackPage = { items: FeedbackItem[]; total: number };
