import type { PrismaTx } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { levelFor } from '../gamification/level';
import { STANDING_STATUSES } from '../shared/matches';
import { STUDENT_REF_SELECT, toStudentRef, type StudentRef } from '../students/student-ref';
import type { Candidate } from './engine';

export const CANDIDATE_WHERE = {
  role: { not: 'ADMIN' },
  suspendedAt: null,
  removedAt: null,
  studentSkills: { some: {} },
} as const satisfies Prisma.StudentWhereInput;

const CANDIDATE_SELECT = {
  ...STUDENT_REF_SELECT,
  xp: true,
  learningGoalStudentSkillId: true,
  studentSkills: { select: { id: true, skillId: true, kind: true } },
} as const satisfies Prisma.StudentSelect;

type CandidateRow = Prisma.StudentGetPayload<{ select: typeof CANDIDATE_SELECT }>;

function toCandidate(row: CandidateRow): Candidate {
  const teach: string[] = [];
  const learn: string[] = [];
  for (const skill of row.studentSkills) (skill.kind === 'TEACH' ? teach : learn).push(skill.skillId);
  const goal = row.studentSkills.find((skill) => skill.id === row.learningGoalStudentSkillId);
  return { id: row.id, teach, learn, goalSkillId: goal?.skillId ?? null, level: levelFor(row.xp) };
}

export async function readCandidates(tx: PrismaTx): Promise<Array<{ ref: StudentRef; candidate: Candidate }>> {
  const rows = await tx.student.findMany({
    where: CANDIDATE_WHERE,
    orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    select: CANDIDATE_SELECT,
  });
  return rows.map((row) => ({ ref: toStudentRef(row), candidate: toCandidate(row) }));
}

export async function readCandidatesByIds(tx: PrismaTx, ids: [string, string]): Promise<Candidate[]> {
  const rows = await tx.student.findMany({
    where: { id: { in: ids }, ...CANDIDATE_WHERE },
    select: CANDIDATE_SELECT,
  });
  return rows.map(toCandidate);
}

export async function unmatchedIn(tx: PrismaTx, roundId: string): Promise<StudentRef[]> {
  const standingInRound = { roundId, status: { in: [...STANDING_STATUSES] } };
  const rows = await tx.student.findMany({
    where: {
      ...CANDIDATE_WHERE,
      matchesAsMentor: { none: standingInRound },
      matchesAsMentee: { none: standingInRound },
    },
    orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    select: STUDENT_REF_SELECT,
  });
  return rows.map(toStudentRef);
}
