import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query';
import type { Role } from '@shared/roles';
import type { StudentStatus } from '@shared/student-status';
import { apiFetch } from './client';
import type { AdminRoundMatch } from './matches';
import {
  STUDENT_SEARCH_QUERY_KEY,
  studentQueryKey,
  type LearningGoalView,
  type SearchOrder,
  type SkillsView,
} from './profile';
import type { Badge } from './progress';
import { writeAsSignedIn } from './session';
import { uploadFile, type UploadOptions } from './upload';

// §6.12's Users-table routes, with the exact wire shapes the API returns.
// Only Admins read them, so a Removed account keeps its name and email here
// (§4.6).

// One row: name, email, role and status, Removed rows included.
export interface AdminStudentRow {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  status: StudentStatus;
  avatarUrl: string | null;
}

export interface AdminStudentPage {
  items: AdminStudentRow[];
  total: number;
}

// One of the Student's Matches: a Round's row with that Round's number.
export interface AdminStudentMatch extends AdminRoundMatch {
  roundNumber: number;
}

// The §6.2 profile plus email, role, status, avatar and the Student's
// Matches. Never their Friends, requests, Blocks or Direct Messages (§4.6).
export interface AdminStudentDetail {
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
  matches: AdminStudentMatch[];
}

export type UserSort = 'name' | 'email';

// What the Users table sends; an absent filter is no filter (§6.12).
export interface AdminStudentsParams {
  q?: string;
  role?: Role;
  status?: StudentStatus;
  sort: UserSort;
  order: SearchOrder;
  page: number;
  pageSize: number;
}

// Every key under ['admin', 'students'] is the Users table, so one prefix
// reads it all again.
export const ADMIN_STUDENTS_QUERY_KEY = ['admin', 'students'] as const;

export function adminStudentQueryKey(id: string): readonly ['admin', 'students', 'one', string] {
  return ['admin', 'students', 'one', id] as const;
}

function studentPath(id: string, rest = ''): string {
  return `/admin/students/${encodeURIComponent(id)}${rest}`;
}

// Reads (§6.12). The search term goes in the query string, never in the path
// (§19 item 19); an id goes in the path only once the page has checked its
// shape (§3.5.2).
export async function fetchAdminStudents(params: AdminStudentsParams): Promise<AdminStudentPage> {
  const query = new URLSearchParams();
  if (params.q !== undefined) query.set('q', params.q);
  if (params.role !== undefined) query.set('role', params.role);
  if (params.status !== undefined) query.set('status', params.status);
  query.set('sort', params.sort);
  query.set('order', params.order);
  query.set('page', String(params.page));
  query.set('pageSize', String(params.pageSize));
  return apiFetch<AdminStudentPage>(`/admin/students?${query.toString()}`);
}

export async function fetchAdminStudent(id: string): Promise<AdminStudentDetail> {
  return apiFetch<AdminStudentDetail>(studentPath(id));
}

// While the next page loads, the previous page's data stays, so the table
// keeps its rows and total in between.
export function adminStudentsQueryOptions(params: AdminStudentsParams) {
  return queryOptions({
    queryKey: [...ADMIN_STUDENTS_QUERY_KEY, 'list', params] as const,
    queryFn: () => fetchAdminStudents(params),
    placeholderData: keepPreviousData,
  });
}

export function adminStudentQueryOptions(id: string) {
  return queryOptions({ queryKey: adminStudentQueryKey(id), queryFn: () => fetchAdminStudent(id) });
}

// The edits (§6.12): each the owner's route of §6.2 or §6.3, on the target.
// A refusal (`student_removed`, `email_unavailable`, `goal_skill_not_listed`,
// a file refusal) is a typed 200 (§6.15).
export function updateStudent(id: string, patch: { displayName?: string; email?: string }): Promise<AdminStudentDetail> {
  return apiFetch<AdminStudentDetail>(studentPath(id), { method: 'PATCH', body: patch });
}

export function setStudentSkills(id: string, input: { teach: string[]; learn: string[] }): Promise<{ goalCleared: boolean }> {
  return apiFetch<{ goalCleared: boolean }>(studentPath(id, '/skills'), { method: 'PUT', body: input });
}

export function setStudentLearningGoal(id: string, input: { skillId: string; text: string }): Promise<LearningGoalView> {
  return apiFetch<LearningGoalView>(studentPath(id, '/learning-goal'), { method: 'PUT', body: input });
}

export function clearStudentLearningGoal(id: string): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>(studentPath(id, '/learning-goal'), { method: 'DELETE', body: {} });
}

// Through `uploadFile`, for its progress and the upload CSRF header (§5.4).
export function uploadStudentAvatar(id: string, file: File, options: UploadOptions): Promise<{ avatarUrl: string }> {
  return uploadFile<{ avatarUrl: string }>(studentPath(id, '/avatar'), file, options);
}

export function deleteStudentAvatar(id: string): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>(studentPath(id, '/avatar'), { method: 'DELETE', body: {} });
}

// `POST /api/admin/students/:id/role` (§12.7): the role alone. The detail
// takes the new role at once and the table is read again; a refusal reads
// both again, since another Admin may have changed the account first. The
// Admin label shows on the Student's public profile and in search (§12.8),
// so the profile is dropped and the search read again. An answer that
// arrives after another Student signed in reaches none of the cache
// (`writeAsSignedIn`).
export function changeStudentRole(queryClient: QueryClient, id: string, role: Role): Promise<void> {
  const reread = (): void => void queryClient.invalidateQueries({ queryKey: ADMIN_STUDENTS_QUERY_KEY });
  return writeAsSignedIn(
    queryClient,
    () => apiFetch<{ role: Role }>(studentPath(id, '/role'), { method: 'POST', body: { role } }),
    async (result) => {
      await queryClient.cancelQueries({ queryKey: adminStudentQueryKey(id) });
      queryClient.setQueryData<AdminStudentDetail>(adminStudentQueryKey(id), (previous) =>
        previous === undefined ? previous : { ...previous, role: result.role },
      );
      queryClient.removeQueries({ queryKey: studentQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: STUDENT_SEARCH_QUERY_KEY });
      reread();
    },
    reread,
  );
}
