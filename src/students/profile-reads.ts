import type { Prisma } from '../generated/prisma/client';
import { STUDENT_REF_SELECT } from './student-ref';
import type { LearningGoalView, SkillView, SkillsView, StudentStatus } from './views';

// The reads every profile shape is built from: the own profile and the public
// one (§6.2), and the Users table's detail (§6.12).

// The public profile's StudentRef fields come from the shared select
// (§6.0.1); the Goal and Progress fields are read beside them.
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

// The row shape comes from the select, so it cannot drift from what the
// query reads.
export type ProfileRow = Prisma.StudentGetPayload<{ select: typeof PROFILE_SELECT }>;
type SkillRow = ProfileRow['studentSkills'][number];

// §4.3.1: status is derived — removedAt → REMOVED, else suspendedAt →
// SUSPENDED, else ACTIVE.
export function deriveStatus(row: { removedAt: Date | null; suspendedAt: Date | null }): StudentStatus {
  if (row.removedAt !== null) return 'REMOVED';
  if (row.suspendedAt !== null) return 'SUSPENDED';
  return 'ACTIVE';
}

// Each list sorted by Skill name (§6.2): the select orders by `skill.name`.
export function skillsOf(rows: SkillRow[]): SkillsView {
  const teach: SkillView[] = [];
  const learn: SkillView[] = [];
  for (const row of rows) {
    if (row.kind === 'TEACH') teach.push(row.skill);
    else learn.push(row.skill);
  }
  return { teach, learn };
}

// The Goal's Skill is one of this Student's own rows (M5), so it is among the
// rows already read; the text lives on the Student (§4.3.1).
export function goalOf(row: ProfileRow): LearningGoalView | null {
  if (row.learningGoalStudentSkillId === null || row.learningGoalText === null) return null;
  const goalRow = row.studentSkills.find((r) => r.id === row.learningGoalStudentSkillId);
  if (goalRow === undefined) return null;
  return { skill: goalRow.skill, text: row.learningGoalText };
}
