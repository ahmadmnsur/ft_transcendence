import type { PrismaTx } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { levelFor } from '../gamification/level';
import { STANDING_STATUSES } from '../shared/matches';
import { STUDENT_REF_SELECT, toStudentRef, type StudentRef } from '../students/student-ref';
import type { Candidate } from './engine';

// §8.1: a candidate lists at least one Skill, of either kind, is not an Admin,
// and is neither Suspended nor Removed. One rule for Round open and for the
// unmatched list, so the two never disagree about who is in the pool.
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

// The engine's input for one candidate (§8.3): Skill ids by list, the Learning
// Goal's Skill, and the Level from the XP read in the same transaction (§8.1).
function toCandidate(row: CandidateRow): Candidate {
  const teach: string[] = [];
  const learn: string[] = [];
  for (const skill of row.studentSkills) (skill.kind === 'TEACH' ? teach : learn).push(skill.skillId);
  // The Goal is one of this Student's own rows (M5), so it is among the rows read.
  const goal = row.studentSkills.find((skill) => skill.id === row.learningGoalStudentSkillId);
  return { id: row.id, teach, learn, goalSkillId: goal?.skillId ?? null, level: levelFor(row.xp) };
}

// Every candidate, by display name with the column's collation, then id. The
// caller reads them inside the transaction that creates the Matches, so a
// role change, a sanction or a Skill edit racing it lands in one serial order
// (ADR-0008 d2).
export async function readCandidates(tx: PrismaTx): Promise<Array<{ ref: StudentRef; candidate: Candidate }>> {
  const rows = await tx.student.findMany({
    where: CANDIDATE_WHERE,
    orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    select: CANDIDATE_SELECT,
  });
  return rows.map((row) => ({ ref: toStudentRef(row), candidate: toCandidate(row) }));
}

// §8.6: the hand-made path reads exactly the two named Students against the
// same predicate, still inside the creating transaction. Fewer than two rows
// means one of them is not a candidate (or does not exist); the caller
// refuses `not_a_candidate` either way.
export async function readCandidatesByIds(tx: PrismaTx, ids: [string, string]): Promise<Candidate[]> {
  const rows = await tx.student.findMany({
    where: { id: { in: ids }, ...CANDIDATE_WHERE },
    select: CANDIDATE_SELECT,
  });
  return rows.map(toCandidate);
}

// §8.9: the Round's unmatched Students, derived now and never stored — the
// candidates with no Match in that Round in a standing status. A Student who
// declined is unmatched again; one whose Match lapsed is not; a Suspended or
// Removed Student is no candidate, so never listed.
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
