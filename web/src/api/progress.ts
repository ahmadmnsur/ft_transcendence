import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from './client';

export type Badge = 'FIRST_MENTOR' | 'KNOWLEDGE_SHARER' | 'CONSISTENT_LEARNER';
export type LevelProgress = { xp: number; level: number; xpIntoLevel: number; xpForNextLevel: number | null };
export type Progress = LevelProgress & { streak: number; badges: { badge: Badge; awardedAt: string }[] };
export type EarnResult = LevelProgress & { xpAwarded: number; badgesAwarded: Badge[] };

export const progressQueryOptions = () => queryOptions({
  queryKey: ['progress'], queryFn: () => apiFetch<Progress>('/me/progress'),
});
