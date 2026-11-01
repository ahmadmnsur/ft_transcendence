import type { BadgeView } from '../gamification/views';
import type { AdminStudentMatch } from '../matching/views';
import type { Role } from '../shared/roles';
import type { LearningGoalView, SkillsView, StudentStatus } from '../students/views';


export type AdminStudentRow = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  status: StudentStatus;
  avatarUrl: string | null;
};

export type AdminStudentPage = { items: AdminStudentRow[]; total: number };

export type AdminStudentDetail = {
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
  matches: AdminStudentMatch[];
};
