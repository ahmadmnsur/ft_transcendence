import { queryOptions } from '@tanstack/react-query';
import type { Role } from '@shared/roles';
import { apiFetch } from './client';

// §6.2's profile routes, with the exact wire shapes the API returns. The
// SPA defines its own view types rather than importing the server's: the
// shapes are the contract, not the server's file.
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

// §6.0.1: `isAdmin` is true only for an ADMIN, and `removed` renders the
// tombstone whatever `displayName` says (§4.6).
export interface StudentRef {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  removed: boolean;
}

export type StudentStatus = 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

// `GET /api/me` and `PATCH /api/me`'s result: the only shape with the email
// (§4.6). `avatarUrl` is null until the avatar slice uploads one.
export interface OwnProfile {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  status: StudentStatus;
  avatarUrl: null;
  skills: SkillsView;
  learningGoal: LearningGoalView | null;
  xp: number;
  level: number;
  streak: number;
}

// `GET /api/students/:id`: never an email, for any viewer (§4.6).
export interface PublicProfile {
  student: StudentRef;
  // Null exactly when the Student is Removed (§4.6).
  profile: null | {
    skills: SkillsView;
    learningGoal: LearningGoalView | null;
    xp: number;
    level: number;
    streak: number;
  };
}

export const ME_QUERY_KEY = ['me'] as const;
export const SKILLS_QUERY_KEY = ['skills'] as const;

export function studentQueryKey(id: string): readonly ['students', string] {
  return ['students', id] as const;
}

// Reads (§6.2).
export async function fetchMe(): Promise<OwnProfile> {
  return apiFetch<OwnProfile>('/me');
}

export async function fetchSkills(): Promise<{ items: SkillView[] }> {
  return apiFetch<{ items: SkillView[] }>('/skills');
}

export async function fetchStudent(id: string): Promise<PublicProfile> {
  return apiFetch<PublicProfile>(`/students/${encodeURIComponent(id)}`);
}

// Writes (§6.2). `PATCH` takes only the fields that changed; the server
// answers a refusal (such as `email_unavailable`) as a typed 200.
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

// One query key per screen state (§3.5.2: all server state through Query).
// The own-profile query is briefly cached like the session and invalidated
// by every write to it; the catalogue is a fixed seed, so it caches the
// longest; a Student's profile is always re-read on the next visit.
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
