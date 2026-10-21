import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { StudentRef } from './profile';
import { apiFetch } from './client';
import { writeAsSignedIn } from './session';

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
export type ReviewDetail = {
  review: { id: string; learned: string; canNowDo: string; createdAt: string } | null;
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

export async function submitReview(client: QueryClient, id: string, input: ReviewInput): Promise<boolean> {
  let submitted = false;
  const reread = (): void => {
    for (const key of ['matches', 'admin', 'feedback', 'feed']) {
      void client
        .cancelQueries({ queryKey: [key] })
        .then(() => client.invalidateQueries({ queryKey: [key] }));
    }
  };
  await writeAsSignedIn(
    client,
    () => apiFetch(`/matches/${encodeURIComponent(id)}/review`, { method: 'POST', body: input }),
    async () => {
      submitted = true;
      reread();
    },
    reread,
  );
  return submitted;
}
