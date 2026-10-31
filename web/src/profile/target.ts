import { useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { deleteAvatar, uploadAvatar } from '../api/avatar';
import {
  ADMIN_STUDENTS_QUERY_KEY,
  adminStudentQueryKey,
  adminStudentQueryOptions,
  clearStudentLearningGoal,
  deleteStudentAvatar,
  setStudentLearningGoal,
  setStudentSkills,
  updateStudent,
  uploadStudentAvatar,
} from '../api/admin-students';
import {
  ME_QUERY_KEY,
  STUDENT_SEARCH_QUERY_KEY,
  clearLearningGoal,
  meQueryOptions,
  setLearningGoal,
  setSkills,
  studentQueryKey,
  updateProfile,
  type LearningGoalView,
  type SkillsView,
} from '../api/profile';
import { SESSION_QUERY_KEY, sessionQueryOptions } from '../api/session';
import type { UploadOptions } from '../api/upload';

export interface EditableProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  skills: SkillsView;
  learningGoal: LearningGoalView | null;
}

export interface ProfileTarget {
  voice: 'own' | 'other';
  profile: EditableProfile | undefined;
  failed: boolean;
  api: {
    updateDetails(patch: { displayName?: string; email?: string }): Promise<{ displayName: string; email: string }>;
    setSkills(input: { teach: string[]; learn: string[] }): Promise<{ goalCleared: boolean }>;
    setLearningGoal(input: { skillId: string; text: string }): Promise<LearningGoalView>;
    clearLearningGoal(): Promise<unknown>;
    uploadAvatar(file: File, options: UploadOptions): Promise<{ avatarUrl: string }>;
    deleteAvatar(): Promise<unknown>;
  };
  apply(change: Partial<EditableProfile>): Promise<void>;
  reread(): void;
}

function refreshOtherViews(
  queryClient: QueryClient,
  studentId: string,
  isViewer: boolean,
  change: Partial<EditableProfile>,
): void {
  queryClient.removeQueries({ queryKey: studentQueryKey(studentId) });
  void queryClient.invalidateQueries({ queryKey: STUDENT_SEARCH_QUERY_KEY });
  if (isViewer && ('displayName' in change || 'avatarUrl' in change)) {
    void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
  }
}

async function patchCache(queryClient: QueryClient, queryKey: QueryKey, change: Partial<EditableProfile>): Promise<void> {
  await queryClient.cancelQueries({ queryKey });
  queryClient.setQueryData<EditableProfile>(queryKey, (previous) =>
    previous === undefined ? previous : { ...previous, ...change },
  );
}

export function useOwnProfileTarget(): ProfileTarget {
  const queryClient = useQueryClient();
  const me = useQuery(meQueryOptions());
  return {
    voice: 'own',
    profile: me.data,
    failed: me.isError && me.data === undefined,
    api: {
      updateDetails: updateProfile,
      setSkills,
      setLearningGoal,
      clearLearningGoal,
      uploadAvatar,
      deleteAvatar,
    },
    apply: async (change) => {
      await patchCache(queryClient, ME_QUERY_KEY, change);
      if (me.data !== undefined) refreshOtherViews(queryClient, me.data.id, true, change);
    },
    reread: () => void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
  };
}

export function useStudentProfileTarget(studentId: string): ProfileTarget {
  const queryClient = useQueryClient();
  const detail = useQuery(adminStudentQueryOptions(studentId));
  const session = useQuery(sessionQueryOptions());
  const self = session.data?.authenticated === true && session.data.student.id === studentId;
  return {
    voice: 'other',
    profile: detail.data,
    failed: detail.isError && detail.data === undefined,
    api: {
      updateDetails: (patch) => updateStudent(studentId, patch),
      setSkills: (input) => setStudentSkills(studentId, input),
      setLearningGoal: (input) => setStudentLearningGoal(studentId, input),
      clearLearningGoal: () => clearStudentLearningGoal(studentId),
      uploadAvatar: (file, options) => uploadStudentAvatar(studentId, file, options),
      deleteAvatar: () => deleteStudentAvatar(studentId),
    },
    apply: async (change) => {
      await patchCache(queryClient, adminStudentQueryKey(studentId), change);
      refreshOtherViews(queryClient, studentId, self, change);
      void queryClient.invalidateQueries({ queryKey: [...ADMIN_STUDENTS_QUERY_KEY, 'list'] });
      if (self) void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
    reread: () => void queryClient.invalidateQueries({ queryKey: adminStudentQueryKey(studentId) }),
  };
}
