import type { EnvRecord } from '../../src/core/env';
import type { PrismaService } from '../../src/core/prisma.service';
import type { Prisma } from '../../src/generated/prisma/client';
import { foldName } from '../../src/shared/fold-name';
import { normalizeEmail } from '../../src/shared/limits';
import { RARE_SKILLS } from '../fixtures/cohort';
import { bootstrapStaff } from './bootstrap';
import { cohortEmails, GAP_SKILL, X_POSITION, Y_POSITION } from './cohort';
import { SeedFailure } from './failure';

// Every email the seed makes at this fixture version: the two bootstrap
// accounts and the thirty of §14.3.
function seedEmails(env: EnvRecord): string[] {
  return [...bootstrapStaff(env).map((staff) => normalizeEmail(staff.email)), ...cohortEmails()];
}

// §14.9's guard, before a run that writes deletes anything: every Student
// must be one the seed makes, by email. Otherwise the record was lost over
// real data, and only a reset, which someone runs on purpose, deletes it.
export async function assertOnlySeedAccounts(
  prisma: PrismaService,
  env: EnvRecord,
  reset: string,
): Promise<void> {
  const foreign = await prisma.student.count({ where: { email: { notIn: seedEmails(env) } } });
  if (foreign > 0) {
    throw new SeedFailure(
      `the database holds ${foreign} account(s) the seed did not make, so nothing was deleted; run ${reset} to empty it`,
    );
  }
}

// §8.1's candidate pool, over which §13.2 counts Demand and Supply. A
// `StudentSkill` row's Student always holds one, the pool's last condition.
const CANDIDATE_POOL: Prisma.StudentWhereInput = {
  role: { not: 'ADMIN' },
  suspendedAt: null,
  removedAt: null,
};

// §14.8, the end-state assertions this fixture version implements.
export async function assertEndState(prisma: PrismaService): Promise<void> {
  // Check 1, Round half: the Prompt half joins with its seed increment.
  const openRounds = await prisma.round.count({ where: { closedAt: null } });
  const closedRounds = await prisma.round.count({ where: { closedAt: { not: null } } });
  if (openRounds !== 0 || closedRounds !== 4) {
    throw new SeedFailure(`check 1: ${openRounds} open and ${closedRounds} closed Rounds; expected 0 and 4`);
  }

  // Check 4: the seeded Private Feedback carries at least three distinct
  // ratings, unrated rows aside.
  const ratings = await prisma.privateFeedback.findMany({
    where: { rating: { not: null } },
    distinct: ['rating'],
    select: { rating: true },
  });
  if (ratings.length < 3) {
    throw new SeedFailure(`check 4: ${ratings.length} distinct non-null ratings among Private Feedback; expected at least 3`);
  }

  // Check 7, the plain gap: a RARE_SKILLS Skill the pool wants and no one in
  // it teaches.
  const rareRows = await prisma.studentSkill.findMany({
    where: { student: CANDIDATE_POOL, skill: { name: { in: [...RARE_SKILLS] } } },
    select: { kind: true, skill: { select: { name: true } } },
  });
  const plainGap = RARE_SKILLS.some((name) => {
    const rows = rareRows.filter((row) => row.skill.name === name);
    return rows.some((row) => row.kind === 'LEARN') && !rows.some((row) => row.kind === 'TEACH');
  });
  if (!plainGap) {
    throw new SeedFailure('check 7: no RARE_SKILLS Skill has Demand > 0 and Supply = 0 over the candidate pool');
  }

  // Check 8: G has demand and supply in the active candidate pool, but
  // no coverage and no Match of the blocked pair, in either orientation.
  const gapRows = await prisma.studentSkill.findMany({
    where: { student: CANDIDATE_POOL, skill: { name: GAP_SKILL } },
    select: { kind: true },
  });
  const gapCoverage = await prisma.matchSkillCoverage.count({ where: { skill: { name: GAP_SKILL } } });
  const emails = cohortEmails();
  const x = { email: emails[X_POSITION] };
  const y = { email: emails[Y_POSITION] };
  const blockedPairMatches = await prisma.match.count({
    where: { OR: [{ mentor: x, mentee: y }, { mentor: y, mentee: x }] },
  });
  if (!gapRows.some((row) => row.kind === 'LEARN') || !gapRows.some((row) => row.kind === 'TEACH') ||
      gapCoverage !== 0 || blockedPairMatches !== 0) {
    throw new SeedFailure('check 8: G must have Demand > 0, Supply > 0, no coverage and no Match joining X and Y');
  }

  // Check 10: every Student's search column is the fold of its name. It
  // covers the two bootstrap accounts, which the suite never reaches.
  const students = await prisma.student.findMany({
    select: { displayName: true, displayNameSearch: true },
  });
  const wrong = students.filter(
    (student) => student.displayNameSearch !== foldName(student.displayName),
  ).length;
  if (wrong > 0) {
    throw new SeedFailure(
      `check 10: ${wrong} of ${students.length} Students have a display_name_search other than foldName(display_name)`,
    );
  }
}
