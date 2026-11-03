import { queryOptions } from '@tanstack/react-query';
import type { NewDotKey, NewDots } from '@shared/new-dots';
import { apiFetch } from './client';

export type { NewDots } from '@shared/new-dots';

export const NEW_DOTS_QUERY_KEY = ['new-dots'] as const;

export function fetchNewDots(signal: AbortSignal): Promise<NewDots> {
  return apiFetch<NewDots>('/me/new-dots', { signal });
}

export function newDotsQueryOptions(studentId: string | null) {
  return queryOptions({
    queryKey: [...NEW_DOTS_QUERY_KEY, studentId],
    enabled: studentId !== null,
    queryFn: ({ signal }) => fetchNewDots(signal),
  });
}

export function postOpenedPage(page: NewDotKey, matchId?: string): Promise<NewDots> {
  return apiFetch<NewDots>('/me/new-dots/opened', {
    method: 'POST', body: { page, ...(matchId === undefined ? {} : { matchId }) },
  });
}
