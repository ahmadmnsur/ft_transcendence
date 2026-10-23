import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export type Badge = 'FIRST_MENTOR' | 'KNOWLEDGE_SHARER' | 'CONSISTENT_LEARNER';
export type LevelProgress = { xp: number; level: number; xpIntoLevel: number; xpForNextLevel: number | null };
export type Progress = LevelProgress & { streak: number; badges: { badge: Badge; awardedAt: string }[] };
export type EarnResult = LevelProgress & { xpAwarded: number; badgesAwarded: Badge[] };

export const PROGRESS_QUERY_KEY = ['progress'] as const;

export const progressQueryOptions = () => queryOptions({
  queryKey: PROGRESS_QUERY_KEY, queryFn: () => apiFetch<Progress>('/me/progress'),
});

// §10.7: `round:closed` reads the signed-in Student's progress again. Cancel first: a read
// still in flight may have answered before the close committed, and a first read in flight
// would otherwise be reused.
export async function readProgressAgain(client: QueryClient): Promise<void> {
  await client.cancelQueries({ queryKey: PROGRESS_QUERY_KEY });
  await client.invalidateQueries({ queryKey: PROGRESS_QUERY_KEY });
}
