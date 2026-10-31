import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { LIMITS } from '@shared/limits';
import type { StudentRef } from './profile';
import type { EarnResult } from './progress';
import { apiFetch } from './client';
import { writeAsSignedIn } from './session';
import { uploadFile, type UploadOptions } from './upload';

export type ReviewInput = {
  learningOutcome: { learned: string; canNowDo: string };
  privateFeedback: { answerUsefulness: string; answerExplanation: string; rating?: number };
  publicTakeaway: string;
};
export type PrivateFeedback = {
  answerUsefulness: string;
  answerExplanation: string;
  rating: number | null;
  createdAt: string;
};
export type EvidenceView = { token: string; mime: EvidenceType; size: number; filename: string };
export type EvidenceType = (typeof LIMITS.evidence.mimeTypes)[number];
export type ReviewDetail = {
  review: {
    id: string;
    learned: string;
    canNowDo: string;
    createdAt: string;
    evidence: EvidenceView | null;
  } | null;
  privateFeedback: PrivateFeedback | null;
};
export type FeedbackItem = PrivateFeedback & { matchId: string; roundNumber: number; author: StudentRef };
export type FeedbackPage = { items: FeedbackItem[]; total: number };

export function feedbackQueryOptions(page: number, pageSize: number) {
  return queryOptions({
    queryKey: ['feedback', page, pageSize] as const,
    queryFn: () => apiFetch<FeedbackPage>(`/me/feedback-received?page=${page}&pageSize=${pageSize}`),
  });
}

export async function submitReview(client: QueryClient, id: string, input: ReviewInput): Promise<EarnResult | null> {
  let submitted: EarnResult | null = null;
  const reread = (): void => {
    for (const key of ['matches', 'admin', 'feedback', 'feed', 'progress', 'me', 'students']) {
      void client
        .cancelQueries({ queryKey: [key] })
        .then(() => client.invalidateQueries({ queryKey: [key] }));
    }
  };
  await writeAsSignedIn(
    client,
    () => apiFetch<EarnResult>(`/matches/${encodeURIComponent(id)}/review`, { method: 'POST', body: input }),
    async (result) => {
      submitted = result;
      reread();
    },
    reread,
  );
  return submitted;
}

export function evidenceUrl(token: string): string {
  return `/api/files/evidence/${encodeURIComponent(token)}`;
}

export function uploadEvidence(reviewId: string, file: File, options: UploadOptions): Promise<EvidenceView> {
  return uploadFile<EvidenceView>(`/reviews/${encodeURIComponent(reviewId)}/evidence`, file, options);
}

export function deleteEvidence(reviewId: string): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>(`/reviews/${encodeURIComponent(reviewId)}/evidence`, {
    method: 'DELETE',
    body: {},
  });
}
