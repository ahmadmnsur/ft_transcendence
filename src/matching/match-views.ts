import type { PrismaTx } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { MATCH_STATUSES } from '../shared/matches';
import { STUDENT_REF_SELECT, toStudentRef, type StudentRef } from '../students/student-ref';
import type {
  AdminMatchView,
  AdminRoundMatch,
  AdminStudentMatch,
  CoverageView,
  MatchView,
  StatusCounts,
} from './views';


export async function roundNumberOf(tx: PrismaTx, round: { id: string; openedAt: Date }): Promise<number> {
  return tx.round.count({
    where: {
      OR: [{ openedAt: { lt: round.openedAt } }, { openedAt: round.openedAt, id: { lte: round.id } }],
    },
  });
}

export async function roundNumbers(tx: PrismaTx): Promise<Map<string, number>> {
  const rounds = await tx.round.findMany({ orderBy: [{ openedAt: 'asc' }, { id: 'asc' }], select: { id: true } });
  return new Map(rounds.map((round, index) => [round.id, index + 1]));
}

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

export async function readStudentMatches(tx: PrismaTx, studentId: string): Promise<AdminStudentMatch[]> {
  const rows = await tx.match.findMany({
    where: { OR: [{ mentorId: studentId }, { menteeId: studentId }] },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { ...ROUND_MATCH_SELECT, roundId: true },
  });
  if (rows.length === 0) return [];
  const numbers = await roundNumbers(tx);
  return rows.map((row) => ({ ...toAdminRoundMatch(row), roundNumber: numbers.get(row.roundId) ?? 0 }));
}

export function emptyCounts(): StatusCounts {
  return Object.fromEntries(MATCH_STATUSES.map((status) => [status, 0])) as StatusCounts;
}
