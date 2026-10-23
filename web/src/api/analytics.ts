import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { SkillView } from './profile';

type SkillInsight = { skill: SkillView; demand: number; supply: number };
export type Completion = { completed: number; total: number; rate: number | null };
export type Analytics = {
  skills: {
    mostRequested: { skill: SkillView; demand: number }[];
    mostAvailable: { skill: SkillView; supply: number }[];
    gap: (SkillInsight & { gap: number })[];
  };
  insights: { gap: SkillInsight[]; uncovered: SkillInsight[] };
  completion: { overall: Completion; perRound: (Completion & { roundNumber: number })[] };
  outcomes: {
    closed: { COMPLETED: number; LAPSED: number; DECLINED: number; TERMINATED_BY_ADMIN: number };
    open: { roundNumber: number; MATCHED: number; ACCEPTED: number } | null;
  };
};

export const analyticsQueryOptions = () => queryOptions({
  queryKey: ['analytics'],
  queryFn: () => apiFetch<Analytics>('/admin/analytics'),
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});
