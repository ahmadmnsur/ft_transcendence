import type { BadgeView } from '../gamification/views';
import type { AdminStudentMatch } from '../matching/views';
import type { Role } from '../shared/roles';
import type { LearningGoalView, SkillsView, StudentStatus } from '../students/views';

// §6.12's wire shapes, exact field names: the SPA depends on them. Only
// Admins read them, so a Removed Student keeps their name and email here: the
// record stays where only Admins can view it (§4.6, ADR-0008 d7).

// One row of the Users table: name, email, role and status, Removed rows
// included.
export type AdminStudentRow = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  status: StudentStatus;
  avatarUrl: string | null;
};

// §6.0.1's table page: one page of rows and the count of every match.
export type AdminStudentPage = { items: AdminStudentRow[]; total: number };

// `GET /api/admin/students/:id`: the §6.2 profile plus email, role, status,
// avatar and the Student's Matches. Never their Friends, requests, Blocks or
// Direct Messages (§4.6).
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
