import type { StudentRef } from '../students/student-ref';
import type { EarnResult } from '../gamification/views';

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

export type EvidenceView = { token: string; mime: string; size: number; filename: string };

export type ReviewDetail = {
  review: {
    id: string;
    learned: string;
    canNowDo: string;
    createdAt: string;
    evidence: EvidenceView | null;
  } | null;
  privateFeedback: PrivateFeedbackView | null;
};

export type SubmitReviewResult = EarnResult & { reviewId: string; postId: string };
export type FeedbackItem = PrivateFeedbackView & { matchId: string; roundNumber: number; author: StudentRef };
export type FeedbackPage = { items: FeedbackItem[]; total: number };
