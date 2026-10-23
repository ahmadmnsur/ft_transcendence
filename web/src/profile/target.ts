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

// What the profile cards show and edit (§6.2): the signed-in Student's own
// profile on `/me`, or another Student's on the Users table (§6.12).
export interface EditableProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  skills: SkillsView;
  learningGoal: LearningGoalView | null;
}

// One profile the cards edit: its read, its writes, and how the cache learns
// what a write left. The cards hold the forms; the target knows whose profile
// it is and which other views show it.
export interface ProfileTarget {
  // `own` speaks to the Student ("your"); `other` speaks about them
  // ("their"), for an Admin.
  voice: 'own' | 'other';
  profile: EditableProfile | undefined;
  // The read failed and nothing is cached: the page shows the failure once.
  failed: boolean;
  // The writes, each answered as its route answers (§6.2, §6.3, §6.12).
  api: {
    updateDetails(patch: { displayName?: string; email?: string }): Promise<{ displayName: string; email: string }>;
    setSkills(input: { teach: string[]; learn: string[] }): Promise<{ goalCleared: boolean }>;
    setLearningGoal(input: { skillId: string; text: string }): Promise<LearningGoalView>;
    clearLearningGoal(): Promise<unknown>;
    uploadAvatar(file: File, options: UploadOptions): Promise<{ avatarUrl: string }>;
    deleteAvatar(): Promise<unknown>;
  };
  // Puts what a write left into the cached profile at once, after cancelling
  // a read that may have answered before the write, then drops or reads
  // again the other views that show it.
  apply(change: Partial<EditableProfile>): Promise<void>;
  // Reads the profile again: a stopped upload may still have been saved, and
  // a save is confirmed in the background.
  reread(): void;
}

// The views besides the profile's own read that show a Student's profile
// fields. Their public profile is dropped, not just invalidated: an inactive
// query would render the old values until its background refetch returns, so
// the next visit loads afresh. The search pages show the name, the avatar
// and the Skills; the header shows the signed-in Student's own name and
// avatar (§6.1).
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

// `/me`: the signed-in Student's own profile, `GET /api/me`.
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

// `/admin/users/:studentId`: another Student's profile, edited through the
// Users table's routes (§6.12). The table shows the name and email too, so it
// is read again after every write. An Admin may edit their own account here,
// and then `/me` and the header show the change as well.
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
