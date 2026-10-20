import type { PrismaTx } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { MATCH_STATUSES } from '../shared/matches';
import { STUDENT_REF_SELECT, toStudentRef, type StudentRef } from '../students/student-ref';
import type {
  AdminMatchView,
  AdminRoundMatch,
  CoverageView,
  MatchView,
  StatusCounts,
} from './views';

// The reads every Match view is built from, and the Round-number rule.

// §4.3.9: a Round's number is its 1-based position by (opened_at, id).
export async function roundNumberOf(tx: PrismaTx, round: { id: string; openedAt: Date }): Promise<number> {
  return tx.round.count({
    where: {
      OR: [{ openedAt: { lt: round.openedAt } }, { openedAt: round.openedAt, id: { lte: round.id } }],
    },
  });
}

// Every Round's number by id, for a read that shows Matches from several
// Rounds. A cohort runs a handful of Rounds, so one read of all of them is
// cheaper than a count per row.
export async function roundNumbers(tx: PrismaTx): Promise<Map<string, number>> {
  const rounds = await tx.round.findMany({ orderBy: [{ openedAt: 'asc' }, { id: 'asc' }], select: { id: true } });
  return new Map(rounds.map((round, index) => [round.id, index + 1]));
}

// A Match with its frozen explanation by Skill name and its Round's position
// keys. The people it names are read apart, by `readPeople`.
export const MATCH_SELECT = {
  id: true,
  status: true,
  mission: true,
  compatibilityScore: true,
  goalBonusApplied: true,
  mentorId: true,
  menteeId: true,
  declinedById: true,
  mentorAcceptedAt: true,
  menteeAcceptedAt: true,
  round: { select: { id: true, openedAt: true } },
  coverage: {
    orderBy: [{ skill: { name: 'asc' } }, { direction: 'asc' }],
    select: { direction: true, skill: { select: { id: true, name: true } } },
  },
} as const satisfies Prisma.MatchSelect;

export type MatchRow = Prisma.MatchGetPayload<{ select: typeof MATCH_SELECT }>;

type PersonRow = Prisma.StudentGetPayload<{ select: typeof STUDENT_REF_SELECT }>;

// The people some Match rows name, as StudentRef fields (§6.0.1: never an
// email), by id. A second query rather than three relations on the Match:
// Prisma 7.10 fetches three or more relations of one row at once, which on a
// transaction's single connection makes pg 8.23 log a deprecation warning.
export type People = Map<string, PersonRow>;

export async function readPeople(tx: PrismaTx, rows: readonly MatchRow[]): Promise<People> {
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.mentorId);
    ids.add(row.menteeId);
    if (row.declinedById !== null) ids.add(row.declinedById);
  }
  const people = await tx.student.findMany({ where: { id: { in: [...ids] } }, select: STUDENT_REF_SELECT });
  return new Map(people.map((person) => [person.id, person]));
}

// The foreign keys guarantee every id a Match names has its row.
function personRef(people: People, id: string): StudentRef {
  const person = people.get(id);
  if (person === undefined) throw new Error(`Match names a Student that was not read: ${id}`);
  return toStudentRef(person);
}

function coverageOf(row: MatchRow): CoverageView {
  const coverage: CoverageView = { forward: [], reverse: [] };
  for (const item of row.coverage) {
    (item.direction === 'FORWARD' ? coverage.forward : coverage.reverse).push(item.skill);
  }
  return coverage;
}

// §6.6: the Match as `studentId`, its Mentor or its Mentee, reads it. The
// caller has checked that `studentId` is one of the pair.
export function toMatchView(row: MatchRow, people: People, studentId: string, roundNumber: number): MatchView {
  const asMentor = row.mentorId === studentId;
  return {
    id: row.id,
    roundNumber,
    status: row.status,
    myRole: asMentor ? 'MENTOR' : 'MENTEE',
    partner: personRef(people, asMentor ? row.menteeId : row.mentorId),
    compatibilityScore: row.compatibilityScore,
    handMade: row.compatibilityScore === null,
    goalBonusApplied: row.goalBonusApplied,
    coverage: coverageOf(row),
    mission: row.mission,
    iAccepted: (asMentor ? row.mentorAcceptedAt : row.menteeAcceptedAt) !== null,
    partnerAccepted: (asMentor ? row.menteeAcceptedAt : row.mentorAcceptedAt) !== null,
  };
}

// §6.13: the same Match with both participants named, for an Admin.
export function toAdminMatchView(row: MatchRow, people: People, roundNumber: number): AdminMatchView {
  return {
    id: row.id,
    roundNumber,
    status: row.status,
    mentor: personRef(people, row.mentorId),
    mentee: personRef(people, row.menteeId),
    compatibilityScore: row.compatibilityScore,
    handMade: row.compatibilityScore === null,
    goalBonusApplied: row.goalBonusApplied,
    coverage: coverageOf(row),
    mission: row.mission,
    mentorAccepted: row.mentorAcceptedAt !== null,
    menteeAccepted: row.menteeAcceptedAt !== null,
    declinedBy: row.declinedById === null ? null : personRef(people, row.declinedById),
  };
}

// One row of a Round's Matches for an Admin: the pair, the status, the Score
// or hand-made, the Mission (§6.13).
export const ROUND_MATCH_SELECT = {
  id: true,
  status: true,
  mission: true,
  compatibilityScore: true,
  mentor: { select: STUDENT_REF_SELECT },
  mentee: { select: STUDENT_REF_SELECT },
} as const satisfies Prisma.MatchSelect;

type RoundMatchRow = Prisma.MatchGetPayload<{ select: typeof ROUND_MATCH_SELECT }>;

export function toAdminRoundMatch(row: RoundMatchRow): AdminRoundMatch {
  return {
    id: row.id,
    mentor: toStudentRef(row.mentor),
    mentee: toStudentRef(row.mentee),
    status: row.status,
    compatibilityScore: row.compatibilityScore,
    handMade: row.compatibilityScore === null,
    mission: row.mission,
  };
}

// Every status at zero, so a count a Round lacks still reads 0.
export function emptyCounts(): StatusCounts {
  return Object.fromEntries(MATCH_STATUSES.map((status) => [status, 0])) as StatusCounts;
}
