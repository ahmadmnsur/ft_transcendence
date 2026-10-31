import type { Role } from '../shared/roles';
import type { StudentStatus } from '../shared/student-status';
import type { StudentRef } from './student-ref';
import type { BadgeView } from '../gamification/views';


export type SkillView = { id: string; name: string };

export type LearningGoalView = { skill: SkillView; text: string };

export type SkillsView = { teach: SkillView[]; learn: SkillView[] };

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
  fortyTwoConnected: boolean;
};

export type PublicProfile = {
  student: StudentRef;
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

export type StudentSearchItem = {
  student: StudentRef;
  skills: SkillsView;
  xp: number;
  level: number;
};

export type StudentSearchPage = { items: StudentSearchItem[]; total: number };
