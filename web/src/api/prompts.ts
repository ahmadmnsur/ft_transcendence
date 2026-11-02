import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query';
import { PAGING } from '@shared/limits';
import { apiFetch } from './client';
import type { StudentRef } from './profile';
import type { EarnResult } from './progress';

export type PromptView = { id: string; question: string; publishedAt: string };
export type PromptSummary = PromptView & { live: boolean; answerCount: number };
export type PromptPage = { items: PromptSummary[]; total: number; page: number; pageSize: number };
export type AnswerView = {
  id: string; origin: 'PROMPT_ANSWER'; prompt: { id: string; question: string };
  author: StudentRef; body: string; createdAt: string; likeCount: number; likedByMe: boolean;
};
export type AnswerPage = { prompt: PromptView; live: boolean; answeredByMe: boolean; items: AnswerView[]; total: number };

export const PROMPT_ANSWERS_QUERY_KEY = ['prompts', 'answers'] as const;

export async function readPromptsAgain(client: QueryClient): Promise<void> {
  const queryKey = ['prompts'];
  await client.cancelQueries({ queryKey });
  await client.invalidateQueries({ queryKey });
}

export async function readPromptAnswersAgain(client: QueryClient, promptId: string): Promise<void> {
  const queryKey = [...PROMPT_ANSWERS_QUERY_KEY, promptId];
  await client.cancelQueries({ queryKey });
  await client.invalidateQueries({ queryKey });
}

export const livePromptQueryOptions = () => queryOptions({
  queryKey: ['prompts', 'live'], queryFn: () => apiFetch<{ prompt: PromptView | null; answeredByMe: boolean }>('/prompts/live'),
});
export const promptHistoryQueryOptions = (page: number, admin: boolean) => queryOptions({
  queryKey: ['prompts', 'history', { page, admin }], queryFn: () => apiFetch<PromptPage>(`${admin ? '/admin' : ''}/prompts?page=${page}`),
});
export const promptAnswersQueryOptions = (id: string, page: number) => queryOptions({
  queryKey: [...PROMPT_ANSWERS_QUERY_KEY, id, page],
  queryFn: () => apiFetch<AnswerPage>(`/prompts/${id}/answers?page=${page}&pageSize=${PAGING.defaultPageSize}`),
  placeholderData: keepPreviousData,
});
export const publishPrompt = (question: string) => apiFetch<PromptView>('/admin/prompts', { method: 'POST', body: { question } });
export const answerPrompt = (id: string, body: string) => apiFetch<EarnResult>(`/prompts/${id}/answers`, { method: 'POST', body: { body } });
