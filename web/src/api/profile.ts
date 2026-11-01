import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import type { Role } from '@shared/roles';
import type { StudentStatus } from '@shared/student-status';
import type { Badge } from './progress';
import { apiFetch } from './client';

export interface SkillView {
  id: string;
  name: string;
}

export interface LearningGoalView {
  skill: SkillView;
  text: string;
}

export interface SkillsView {
  teach: SkillView[];
  learn: SkillView[];
}

export interface StudentRef {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  removed: boolean;
}

export type { StudentStatus };

export interface OwnProfile {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  status: StudentStatus;
  avatarUrl: string | null;
  skills: SkillsView;
  learningGoal: LearningGoalView | null;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  badges: { badge: Badge; awardedAt: string }[];
  streak: number;
  fortyTwoConnected: boolean;
}

export interface PublicProfile {
  student: StudentRef;
  profile: null | {
    skills: SkillsView;
    learningGoal: LearningGoalView | null;
    xp: number;
    level: number;
    xpIntoLevel: number;
    xpForNextLevel: number | null;
    badges: { badge: Badge; awardedAt: string }[];
    streak: number;
  };
}

export interface StudentSearchItem {
  student: StudentRef;
  skills: SkillsView;
  xp: number;
  level: number;
}

export interface StudentSearchPage {
  items: StudentSearchItem[];
  total: number;
}

export type SearchSort = 'name' | 'xp' | 'joined';
export type SearchOrder = 'asc' | 'desc';

export interface StudentSearchParams {
  q?: string;
  teaches?: string;
  wants?: string;
  hasGoal?: boolean;
  sort: SearchSort;
  order: SearchOrder;
  page: number;
  pageSize: number;
}

export const ME_QUERY_KEY = ['me'] as const;
export const SKILLS_QUERY_KEY = ['skills'] as const;

export const STUDENT_SEARCH_QUERY_KEY = ['students', 'search'] as const;

export function studentQueryKey(id: string): readonly ['students', string] {
  return ['students', id] as const;
}

export async function fetchMe(): Promise<OwnProfile> {
  return apiFetch<OwnProfile>('/me');
}

export async function fetchSkills(): Promise<{ items: SkillView[] }> {
  return apiFetch<{ items: SkillView[] }>('/skills');
}

export async function fetchStudent(id: string): Promise<PublicProfile> {
  return apiFetch<PublicProfile>(`/students/${encodeURIComponent(id)}`);
}

export async function searchStudents(params: StudentSearchParams): Promise<StudentSearchPage> {
  const query = new URLSearchParams();
  if (params.q !== undefined) query.set('q', params.q);
  if (params.teaches !== undefined) query.set('teaches', params.teaches);
  if (params.wants !== undefined) query.set('wants', params.wants);
  if (params.hasGoal !== undefined) query.set('hasGoal', String(params.hasGoal));
  query.set('sort', params.sort);
  query.set('order', params.order);
  query.set('page', String(params.page));
  query.set('pageSize', String(params.pageSize));
  return apiFetch<StudentSearchPage>(`/students?${query.toString()}`);
}

export async function updateProfile(input: { displayName?: string; email?: string }): Promise<OwnProfile> {
  return apiFetch<OwnProfile>('/me', { method: 'PATCH', body: input });
}

export async function setSkills(input: { teach: string[]; learn: string[] }): Promise<{ goalCleared: boolean }> {
  return apiFetch<{ goalCleared: boolean }>('/me/skills', { method: 'PUT', body: input });
}

export async function setLearningGoal(input: { skillId: string; text: string }): Promise<LearningGoalView> {
  return apiFetch<LearningGoalView>('/me/learning-goal', { method: 'PUT', body: input });
}

export async function clearLearningGoal(): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>('/me/learning-goal', { method: 'DELETE', body: {} });
}

export function meQueryOptions() {
  return queryOptions({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    staleTime: 30_000,
  });
}

export function skillsQueryOptions() {
  return queryOptions({
    queryKey: SKILLS_QUERY_KEY,
    queryFn: fetchSkills,
    staleTime: 5 * 60_000,
  });
}

export function studentQueryOptions(id: string) {
  return queryOptions({
    queryKey: studentQueryKey(id),
    queryFn: () => fetchStudent(id),
  });
}

export function studentSearchQueryOptions(params: StudentSearchParams) {
  return queryOptions({
    queryKey: [...STUDENT_SEARCH_QUERY_KEY, params] as const,
    queryFn: () => searchStudents(params),
    placeholderData: keepPreviousData,
  });
}
