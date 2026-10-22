import type { Role } from '../shared/roles';
import type { StudentStatus } from '../shared/student-status';
import type { StudentRef } from './student-ref';
import type { BadgeView } from '../gamification/views';

// §6.2's wire shapes, exact field names: the SPA task depends on them.

export type SkillView = { id: string; name: string };

export type LearningGoalView = { skill: SkillView; text: string };

// Each list is sorted by Skill name (§6.2).
export type SkillsView = { teach: SkillView[]; learn: SkillView[] };

// §4.3.1's derived status, shared with the SPA.
export type { StudentStatus };

export type OwnProfile = {
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
  badges: BadgeView[];
  streak: number;
  // §6.2: whether a 42 account is connected — never the 42 id itself.
  fortyTwoConnected: boolean;
};

export type PublicProfile = {
  student: StudentRef;
  // Null exactly when the Student is Removed (§4.6).
  profile: null | {
    skills: SkillsView;
    learningGoal: LearningGoalView | null;
    xp: number;
    level: number;
    xpIntoLevel: number;
    xpForNextLevel: number | null;
    badges: BadgeView[];
    streak: number;
  };
};

// One row of §6.2's Advanced search: the person, their Skills, XP and Level.
// Never an email (§4.6).
export type StudentSearchItem = {
  student: StudentRef;
  skills: SkillsView;
  xp: number;
  level: number;
};

// §6.0.1's table page: one page of rows and the count of every match.
export type StudentSearchPage = { items: StudentSearchItem[]; total: number };
