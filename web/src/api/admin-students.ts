import { keepPreviousData, queryOptions, type Query, type QueryClient } from '@tanstack/react-query';
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
import { SESSION_QUERY_KEY, writeAsSignedIn } from './session';
import { uploadFile, type UploadOptions } from './upload';


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

export interface AdminStudentMatch extends AdminRoundMatch {
  roundNumber: number;
}

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

export interface AdminStudentsParams {
  q?: string;
  role?: Role;
  status?: StudentStatus;
  sort: UserSort;
  order: SearchOrder;
  page: number;
  pageSize: number;
}

export const ADMIN_STUDENTS_QUERY_KEY = ['admin', 'students'] as const;

export function adminStudentQueryKey(id: string): readonly ['admin', 'students', 'one', string] {
  return ['admin', 'students', 'one', id] as const;
}

function studentPath(id: string, rest = ''): string {
  return `/admin/students/${encodeURIComponent(id)}${rest}`;
}

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

export function uploadStudentAvatar(id: string, file: File, options: UploadOptions): Promise<{ avatarUrl: string }> {
  return uploadFile<{ avatarUrl: string }>(studentPath(id, '/avatar'), file, options);
}

export function deleteStudentAvatar(id: string): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>(studentPath(id, '/avatar'), { method: 'DELETE', body: {} });
}

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

export type Sanction = 'suspend' | 'reinstate' | 'remove';

export function sanctionStudent(queryClient: QueryClient, id: string, action: Sanction): Promise<void> {
  return writeAsSignedIn(
    queryClient,
    () => apiFetch<{ status: StudentStatus }>(studentPath(id, `/${action}`), { method: 'POST', body: {} }),
    async (result) => {
      await queryClient.cancelQueries({ queryKey: adminStudentQueryKey(id) });
      queryClient.setQueryData<AdminStudentDetail>(adminStudentQueryKey(id), (previous) =>
        previous === undefined
          ? previous
          : { ...previous, status: result.status, ...(result.status === 'REMOVED' ? { avatarUrl: null } : {}) },
      );
      const notSession = (query: Query): boolean => query.queryKey[0] !== SESSION_QUERY_KEY[0];
      queryClient.removeQueries({ type: 'inactive', predicate: notSession });
      void queryClient.invalidateQueries({ predicate: notSession });
    },
    () => void queryClient.invalidateQueries({ queryKey: ADMIN_STUDENTS_QUERY_KEY }),
  );
}
