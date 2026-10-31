import type { Actor } from '../../src/core/actor';
import type { EnvRecord } from '../../src/core/env';
import type { PrismaService } from '../../src/core/prisma.service';
import { Badge, type Prisma } from '../../src/generated/prisma/client';
import type { ModerationService } from '../../src/moderation/moderation.service';
import { foldName } from '../../src/shared/fold-name';
import { normalizeEmail, PAGING } from '../../src/shared/limits';
import { RARE_SKILLS } from '../fixtures/cohort';
import { bootstrapStaff } from './bootstrap';
import { cohortEmails, GAP_SKILL, RESERVED_POSITIONS, X_POSITION, Y_POSITION } from './cohort';
import { SeedFailure } from './failure';
import { PROMPT_QUESTIONS } from './prompts';
import type { ReportFixtures } from './reports';
import type { Sanctioned } from './sanctioned';

function seedEmails(env: EnvRecord): string[] {
  return [...bootstrapStaff(env).map((staff) => normalizeEmail(staff.email)), ...cohortEmails()];
}

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

const CANDIDATE_POOL: Prisma.StudentWhereInput = {
  role: { not: 'ADMIN' },
  suspendedAt: null,
  removedAt: null,
};

export type DemoStudent = { id: string; position: number; email: string };

export async function findDemoStudent(
  prisma: PrismaService,
  cohortIds: readonly string[],
): Promise<DemoStudent> {
  const candidateIds = cohortIds.filter((_, position) => !RESERVED_POSITIONS.includes(position));
  const rows = await prisma.student.findMany({
    where: {
      id: { in: candidateIds },
      role: 'STUDENT',
      suspendedAt: null,
      removedAt: null,
      streak: { gte: 3 },
      badgeAwards: { some: {} },
      matchesAsMentee: { some: { status: 'COMPLETED', review: { isNot: null } } },
      matchesAsMentor: { some: { review: { privateFeedback: { rating: { not: null } } } } },
    },
    select: { id: true, email: true },
  });
  const emails = new Map(rows.map((row) => [row.id, row.email]));
  for (const [position, id] of cohortIds.entries()) {
    const email = emails.get(id);
    if (email !== undefined) return { id, position, email };
  }
  throw new SeedFailure(
    'check 3: no Active STUDENT outside the reserved positions has Streak >= 3, a BadgeAward, ' +
      'a COMPLETED Match as Mentee with its Review, and Private Feedback received as Mentor with a non-null rating',
  );
}

export type ModerationReads = {
  moderation: ModerationService;
  admin: Actor;
  peerModerator: Actor;
  fixtures: ReportFixtures;
};

const MODERATOR_ROW_KEYS = ['createdAt', 'reason', 'text'];

function isModeratorRow(report: object): boolean {
  return Object.keys(report).sort().join() === MODERATOR_ROW_KEYS.join();
}

async function assertModerationViews(reads: ModerationReads): Promise<void> {
  const { moderation, admin, peerModerator, fixtures } = reads;
  const moderatorQueue = await moderation.queue(peerModerator, 'PEER_MODERATOR');
  const grouped = moderatorQueue.items.find(
    (group) => group.target.kind === 'POST' && group.target.post.id === fixtures.groupedPostId,
  );
  if (grouped === undefined || grouped.count !== 2 || grouped.reports.length !== 2 ||
      !grouped.reports.every(isModeratorRow)) {
    throw new SeedFailure("check 6: the Peer Moderator's queue does not show the two-report Post group without its reporters");
  }
  const adminQueue = await moderation.queue(admin, 'ADMIN');
  const reported = adminQueue.items.find(
    (group) => group.target.kind === 'STUDENT' && group.target.student.id === fixtures.reportedStudentId,
  );
  if (reported === undefined || reported.count !== 1) {
    throw new SeedFailure("check 6: the Admin's open queue does not show the Student report");
  }
  const audit = await moderation.resolvedAudit(admin, 1, PAGING.maxPageSize);
  const dismissed = audit.items.find(
    (batch) => batch.target.kind === 'POST' && batch.target.post.id === fixtures.dismissedPostId,
  );
  if (dismissed === undefined || dismissed.state !== 'DISMISSED' ||
      dismissed.resolvedBy.id !== peerModerator.studentId || dismissed.reports.length !== 1 ||
      dismissed.reports[0].reason !== 'OTHER' || dismissed.reports[0].reporter.id !== fixtures.dismissedReporterId) {
    throw new SeedFailure("check 6: the Admin's resolved audit does not show the Peer Moderator's dismissal");
  }
}

export async function assertEndState(
  prisma: PrismaService,
  cohortIds: readonly string[],
  sanctioned: Sanctioned,
  demo: DemoStudent,
  moderationReads: ModerationReads,
): Promise<{ demoStudent: { position: number; email: string } }> {
  const openRounds = await prisma.round.count({ where: { closedAt: null } });
  const closedRounds = await prisma.round.count({ where: { closedAt: { not: null } } });
  if (openRounds !== 0 || closedRounds !== 4) {
    throw new SeedFailure(`check 1: ${openRounds} open and ${closedRounds} closed Rounds; expected 0 and 4`);
  }
  const prompts = await prisma.reflectionPrompt.findMany({
    orderBy: { publicationOrder: 'asc' },
    select: { question: true },
  });
  if (prompts.length !== PROMPT_QUESTIONS.length ||
      !prompts.every((prompt, index) => prompt.question === PROMPT_QUESTIONS[index])) {
    throw new SeedFailure(
      `check 1: ${prompts.length} Prompts; expected §14.4's four, in publication order, the fourth live`,
    );
  }

  const { id, position, email } = await findDemoStudent(prisma, cohortIds);
  if (id !== demo.id) {
    throw new SeedFailure(`check 3: the demo Student is at position ${position}, not ${demo.position} as before §14.4 step 5`);
  }

  const ratings = await prisma.privateFeedback.findMany({
    where: { rating: { not: null } },
    distinct: ['rating'],
    select: { rating: true },
  });
  if (ratings.length < 3) {
    throw new SeedFailure(`check 4: ${ratings.length} distinct non-null ratings among Private Feedback; expected at least 3`);
  }

  const suspended = await prisma.student.findUnique({
    where: { id: sanctioned.suspendedId },
    select: { suspendedAt: true, removedAt: true },
  });
  if (suspended === null || suspended.suspendedAt === null || suspended.removedAt !== null) {
    throw new SeedFailure('check 5: S must be Suspended and not Removed');
  }
  const removedPosition = cohortIds.indexOf(sanctioned.removedId);
  const removed = await prisma.student.findUnique({
    where: { id: sanctioned.removedId },
    select: { removedAt: true, email: true, avatar: { select: { token: true } } },
  });
  if (removedPosition < 0 || removed === null || removed.removedAt === null || removed.avatar !== null ||
      removed.email !== cohortEmails()[removedPosition]) {
    throw new SeedFailure('check 5: R must be Removed, have no Avatar and keep their §14.3 email');
  }
  const retainedEvidence = await prisma.evidence.count({
    where: { review: { match: { menteeId: sanctioned.removedId }, privateFeedback: { isNot: null } } },
  });
  if (retainedEvidence === 0) {
    throw new SeedFailure('check 5: R must retain Evidence on a Review they wrote as Mentee with its Private Feedback');
  }

  await assertModerationViews(moderationReads);

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

  const awards = await prisma.badgeAward.findMany({
    where: { student: { suspendedAt: null, removedAt: null } },
    distinct: ['badge'],
    select: { badge: true },
  });
  const held = new Set(awards.map((award) => award.badge));
  const missing = Object.values(Badge).filter((badge) => !held.has(badge));
  if (missing.length > 0) {
    throw new SeedFailure(`check 9: no Active Student holds ${missing.join(', ')}`);
  }

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
  return { demoStudent: { position, email } };
}
