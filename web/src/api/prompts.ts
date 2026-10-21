import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { StudentRef } from './profile';

export type PromptView = { id: string; question: string; publishedAt: string };
export type PromptSummary = PromptView & { live: boolean; answerCount: number };
export type PromptPage = { items: PromptSummary[]; total: number; page: number; pageSize: number };
export type AnswerView = {
  id: string; origin: 'PROMPT_ANSWER'; prompt: { id: string; question: string };
  author: StudentRef; body: string; createdAt: string; likeCount: number; likedByMe: boolean;
};
export type AnswerPage = { prompt: PromptView; live: boolean; answeredByMe: boolean; items: AnswerView[]; nextCursor: string | null };

export const livePromptQueryOptions = () => queryOptions({
  queryKey: ['prompts', 'live'], queryFn: () => apiFetch<{ prompt: PromptView | null; answeredByMe: boolean }>('/prompts/live'),
});
export const promptHistoryQueryOptions = (page: number) => queryOptions({
  queryKey: ['prompts', 'history', page], queryFn: () => apiFetch<PromptPage>(`/prompts?page=${page}`),
});
export const readPromptAnswers = (id: string, cursor?: string) => apiFetch<AnswerPage>(`/prompts/${id}/answers${cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`}`);
export const publishPrompt = (question: string) => apiFetch<PromptView>('/admin/prompts', { method: 'POST', body: { question } });
export const answerPrompt = (id: string, body: string) => apiFetch<AnswerView>(`/prompts/${id}/answers`, { method: 'POST', body: { body } });
