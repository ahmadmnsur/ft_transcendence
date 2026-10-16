import type { Role } from '../shared/roles';
import type { StudentRef } from './student-ref';

// §6.2's wire shapes, exact field names: the SPA task depends on them.

export type SkillView = { id: string; name: string };

export type LearningGoalView = { skill: SkillView; text: string };

// Each list is sorted by Skill name (§6.2).
export type SkillsView = { teach: SkillView[]; learn: SkillView[] };

// §4.3.1: status is derived — removedAt → REMOVED, else suspendedAt →
// SUSPENDED, else ACTIVE.
export type StudentStatus = 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

export type OwnProfile = {
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
};

export type PublicProfile = {
  student: StudentRef;
  // Null exactly when the Student is Removed (§4.6).
  profile: null | {
    skills: SkillsView;
    learningGoal: LearningGoalView | null;
    xp: number;
    level: number;
    streak: number;
  };
};
