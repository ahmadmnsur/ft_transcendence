import type { Prisma } from '../generated/prisma/client';
import { STUDENT_REF_SELECT } from './student-ref';
import type { LearningGoalView, SkillView, SkillsView, StudentStatus } from './views';


export const PROFILE_SELECT = {
  ...STUDENT_REF_SELECT,
  xp: true,
  streak: true,
  badgeAwards: {
    select: { badge: true, awardedAt: true },
    orderBy: [{ awardedAt: 'asc' }, { badge: 'asc' }],
  },
  suspendedAt: true,
  learningGoalStudentSkillId: true,
  learningGoalText: true,
  studentSkills: {
    orderBy: { skill: { name: 'asc' } },
    select: { id: true, kind: true, skill: { select: { id: true, name: true } } },
  },
} as const satisfies Prisma.StudentSelect;

export type ProfileRow = Prisma.StudentGetPayload<{ select: typeof PROFILE_SELECT }>;
type SkillRow = ProfileRow['studentSkills'][number];

export function deriveStatus(row: { removedAt: Date | null; suspendedAt: Date | null }): StudentStatus {
  if (row.removedAt !== null) return 'REMOVED';
  if (row.suspendedAt !== null) return 'SUSPENDED';
  return 'ACTIVE';
}

export function skillsOf(rows: SkillRow[]): SkillsView {
  const teach: SkillView[] = [];
  const learn: SkillView[] = [];
  for (const row of rows) {
    if (row.kind === 'TEACH') teach.push(row.skill);
    else learn.push(row.skill);
  }
  return { teach, learn };
}

export function goalOf(row: ProfileRow): LearningGoalView | null {
  if (row.learningGoalStudentSkillId === null || row.learningGoalText === null) return null;
  const goalRow = row.studentSkills.find((r) => r.id === row.learningGoalStudentSkillId);
  if (goalRow === undefined) return null;
  return { skill: goalRow.skill, text: row.learningGoalText };
}
