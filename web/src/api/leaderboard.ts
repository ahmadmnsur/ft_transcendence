import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { StudentRef } from './profile';

export type LeaderboardPosition = { rank: number; xp: number; level: number };
export type Leaderboard = {
  top: (LeaderboardPosition & { student: StudentRef })[];
  me: LeaderboardPosition | null;
};

export const leaderboardQueryOptions = () => queryOptions({
  queryKey: ['leaderboard'],
  queryFn: () => apiFetch<Leaderboard>('/leaderboard'),
});
