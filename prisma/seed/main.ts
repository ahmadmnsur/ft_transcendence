import 'reflect-metadata';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AuthService } from '../../src/auth/auth.service';
import { assertEnvOrExit, resolveSupabaseTarget } from '../../src/core/env';
import { ApiError, Refusal } from '../../src/core/errors';
import { AppLogger, errorFields, exitOnUncaught } from '../../src/core/logger';
import { PrismaService } from '../../src/core/prisma.service';
import { SupabaseAuthClient } from '../../src/core/supabase-auth';
import { SupabaseStorageClient } from '../../src/core/supabase-storage';
import { UnitOfWork } from '../../src/core/uow';
import { FeedService } from '../../src/feed/feed.service';
import { BucketStepError, ensureBuckets, PRODUCTION_BUCKETS, type BucketStepResult } from '../../src/files/buckets';
import { MatchingService } from '../../src/matching/matching.service';
import { MessagingService } from '../../src/messaging/messaging.service';
import { ModerationService } from '../../src/moderation/moderation.service';
import { PromptsService } from '../../src/prompts/prompts.service';
import { ReviewsService } from '../../src/reviews/reviews.service';
import { SocialService } from '../../src/social/social.service';
import { StudentsService } from '../../src/students/students.service';
import { bootstrapStaff, createStaffAccount } from './bootstrap';
import { insertCatalogue } from './catalogue';
import { assertEndState, assertOnlySeedAccounts, findDemoStudent } from './checks';
import {
  assertIdOrder,
  cohortPlan,
  RESERVED_POSITIONS,
  setCohortLists,
  setPeerModeratorLists,
  signUpCohort,
  X_POSITION,
  Y_POSITION,
} from './cohort';
import { anyDomainRows, emptyEverything } from './empty';
import { SeedFailure } from './failure';
import { openLockConnection, takeSeedLock, type LockConnection } from './lock';
import { promptScript } from './prompts';
import { FIXTURE_VERSION, clearRecord, readRecord, writeRecord } from './record';
import { seedReports } from './reports';
import { submitReviewsInOrder } from './reviews';
import { ROUND_TARGETS, seedRound, type SeededRound } from './rounds';
import { completedMentees, selectRemoved, selectSuspended } from './sanctioned';
import { SeedModule } from './seed.module';
import { activeCohort, eligibleStudents, seedDirectMessages, seedLikes, seedSocialGraph } from './social';

// §9.8's bucket step. Its failure names the bucket, and only a SeedFailure's
// message reaches the log, so it is carried in one.
async function setBuckets(storage: SupabaseStorageClient): Promise<BucketStepResult> {
  try {
    return await ensureBuckets(storage, PRODUCTION_BUCKETS);
  } catch (err) {
    throw err instanceof BucketStepError ? new SeedFailure(err.message) : err;
  }
}

// The seed (§14): on every boot, after `migrate deploy`. It either finds its
// completed fixture and skips, or empties and writes it whole, ending with
// the completion record. Any failure logs the step and exits 1, so the `api`
// never starts (§14.9, §15.5). It logs step names and counts, never a
// password (§3.9).

const started = Date.now();
const logger = new AppLogger();

process.on('uncaughtException', exitOnUncaught('uncaughtException'));
process.on('unhandledRejection', exitOnUncaught('unhandledRejection'));

function log(message: string, fields: Record<string, unknown> = {}): void {
  logger.entry('log', { message, ...fields });
}

function elapsed(): { durationMs: number } {
  return { durationMs: Date.now() - started };
}

class StepFailed extends Error {
  constructor(
    readonly step: string,
    readonly reason: unknown,
  ) {
    super(step);
  }
}

async function step<T>(name: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    throw new StepFailed(name, err);
  }
}

// A code that carries no value, logged beside errorFields so the reason is
// more than a class: a refusal's or protocol error's code, a SQLSTATE from the
// lock's connection, or Node's network code. Prisma's own code is already in
// errorFields.
function valueFreeCode(err: unknown): { errorCode: string } | Record<string, never> {
  if (err instanceof Refusal || err instanceof ApiError) return { errorCode: err.code };
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code !== 'string' || /^P\d{4}$/.test(code)) return {};
  return /^[0-9A-Z]{5}$/.test(code) || /^E[A-Z0-9_]+$/.test(code) ? { errorCode: code } : {};
}

function logFailure(err: unknown): void {
  const name = err instanceof StepFailed ? err.step : 'unknown';
  const reason = err instanceof StepFailed ? err.reason : err;
  // Only the seed's own failures carry a message safe to log.
  const detail =
    reason instanceof SeedFailure
      ? { reason: reason.message }
      : { ...errorFields(reason), ...valueFreeCode(reason) };
  logger.entry('error', { message: 'seed failed', step: name, ...detail, ...elapsed() });
}

// A lost lock connection stops the run at once: a second seed could take the
// freed lock and start deleting while this one still writes (§14.9).
function lockLost(): void {
  logFailure(new StepFailed('lock', new SeedFailure('the lock connection was lost')));
  process.exit(1);
}

// What each target's messages name (§14.9). On the fallback `make wipe`
// also empties everything, by dropping the volumes, so the guard names both.
const REMEDIES = {
  team: { olderRecord: 'make reset-team', foreignAccounts: 'make reset-team' },
  fallback: { olderRecord: 'make wipe', foreignAccounts: 'make reset-local or make wipe' },
} as const;

async function run(): Promise<number> {
  const remedy = REMEDIES[resolveSupabaseTarget(process.env).kind === 'team' ? 'team' : 'fallback'];
  let app: INestApplicationContext | undefined;
  let lock: LockConnection | undefined;
  try {
    app = await step('start', () =>
      NestFactory.createApplicationContext(SeedModule, { logger, abortOnError: false }),
    );
    const prisma = app.get(PrismaService);
    const supabase = app.get(SupabaseAuthClient);
    const storage = app.get(SupabaseStorageClient);
    const uow = app.get(UnitOfWork);
    const auth = app.get(AuthService);
    const students = app.get(StudentsService);
    const social = app.get(SocialService);
    const matching = app.get(MatchingService);
    const reviews = app.get(ReviewsService);
    const prompts = app.get(PromptsService);
    const feed = app.get(FeedService);
    const messaging = app.get(MessagingService);
    const moderation = app.get(ModerationService);

    // §9.8: the seed's first step, on every run, before the record is read,
    // so a run that skips the fixture still sets the buckets. A failure stops
    // the seed, and with it the boot.
    const buckets = await step('buckets', () => setBuckets(storage));
    log('seed: buckets', buckets);

    // The lock comes first, before the record is read, and is kept to the end.
    lock = await step('lock', () => openLockConnection(process.env, lockLost));
    const db = lock.client;
    await step('lock', () =>
      takeSeedLock(db, () => log('waiting for the seed lock: another seed or a reset holds it')),
    );

    const recordedVersion = await step('read record', () => readRecord(db));
    const holdsRows = await step('read tables', () => anyDomainRows(db));
    if (recordedVersion !== null && holdsRows) {
      if (recordedVersion === FIXTURE_VERSION) {
        log(`seed already complete (fixture-v${recordedVersion})`, elapsed());
      } else if (recordedVersion < FIXTURE_VERSION) {
        logger.entry('warn', {
          message: `seed record fixture-v${recordedVersion} is older than this checkout's fixture-v${FIXTURE_VERSION}; nothing written. To seed afresh, run ${remedy.olderRecord}`,
          ...elapsed(),
        });
      } else {
        logger.entry('warn', {
          message: `seed record fixture-v${recordedVersion} is newer than this checkout's fixture-v${FIXTURE_VERSION}; nothing written. Pull main`,
          ...elapsed(),
        });
      }
      return 0;
    }

    // A run that writes: the guard, then a stale record cleared as the first
    // write, then the emptying, then the fixture from step 1.
    await step('guard', () => assertOnlySeedAccounts(prisma, process.env, remedy.foreignAccounts));
    if (recordedVersion !== null) {
      await step('clear stale record', () => clearRecord(db));
      log('seed: stale record cleared', { fixture: `v${recordedVersion}` });
    }
    const emptied = await step('empty', () => emptyEverything(db, supabase, storage));
    log('seed: emptied', emptied);

    // §14.4 step 1: the catalogue, the bootstrap accounts, the thirty
    // sign-ups with their lists and Goals, then the Peer Moderator's lists.
    const skillIds = await step('catalogue', () => insertCatalogue(uow));
    log('seed: catalogue', { skills: skillIds.size });
    const staff = bootstrapStaff(process.env);
    const staffIds = await step('bootstrap accounts', async () => {
      let adminId: string | undefined;
      let peerModeratorId: string | undefined;
      for (const account of staff) {
        const created = await createStaffAccount(account, { supabase, uow });
        if (account.role === 'ADMIN') adminId = created.id;
        if (account.role === 'PEER_MODERATOR') peerModeratorId = created.id;
      }
      if (adminId === undefined || peerModeratorId === undefined) {
        throw new SeedFailure('the bootstrap accounts must hold an Admin and a Peer Moderator');
      }
      return { adminId, peerModeratorId };
    });
    log('seed: bootstrap accounts', { accounts: staff.length });

    const cohort = cohortPlan();
    const studentIds = await step('cohort sign-ups', () => signUpCohort(cohort, process.env, auth));
    await step('cohort id order', () => assertIdOrder(prisma, cohort));
    const goals = await step('cohort lists', () => setCohortLists(cohort, studentIds, skillIds, students));
    log('seed: cohort', { students: studentIds.length, goals });
    const peerModeratorLists = await step('Peer Moderator lists', () =>
      setPeerModeratorLists(staffIds.peerModeratorId, skillIds, students),
    );
    log('seed: Peer Moderator lists', peerModeratorLists);

    // §14.4 step 2 must precede the first matcher run, so G is never covered.
    await step('X Blocks Y', () => social.block(
      { studentId: studentIds[X_POSITION], sessionHash: null }, studentIds[Y_POSITION],
    ));
    log('seed: X Blocks Y');
    const admin = { studentId: staffIds.adminId, sessionHash: null };
    // §14.4 steps 3 and 4: Prompt 1 precedes the Rounds; their opens drive
    // the remaining publications and answers in §14.5.
    const promptSteps = promptScript(prompts, prisma, admin, studentIds, staffIds.peerModeratorId);
    await step('Prompt 1', () => promptSteps.publish(1));
    log('seed: Prompt published', { prompt: 1 });
    const submitReview = submitReviewsInOrder(reviews);
    const rounds: SeededRound[] = [];
    for (let number = 1; number <= 4; number += 1) {
      const round = await step(`Round ${number}`, () =>
        seedRound(matching, submitReview, promptSteps.afterOpen, admin, number),
      );
      log('seed: Round closed', {
        ...round.distribution,
        fullFixtureTarget: ROUND_TARGETS[number - 1],
      });
      rounds.push(round);
    }

    // §14.5's S and R, by its selection rules over Rounds 3 and 4. This
    // version applies neither sanction; §14.6 counts both out all the same.
    const rules = {
      peerModeratorId: staffIds.peerModeratorId,
      reservedIds: RESERVED_POSITIONS.map((position) => studentIds[position]),
    };
    const [, , round3, round4] = rounds;
    const sanctioned = await step('S and R', async () => {
      const suspendedId = selectSuspended(round3.matches, rules);
      const menteesInRounds1to3 = await completedMentees(prisma, rounds.slice(0, 3).map((round) => round.roundId));
      const removedId = selectRemoved(round4.matches, { ...rules, suspendedId, completedMentees: menteesInRounds1to3 });
      return { suspendedId, removedId };
    });
    log('seed: S and R');

    // §14.4 step 5, after Round 4's close: the social graph, Likes, Direct
    // Messages, then the report fixtures. D comes first; the eligible
    // Students exclude D, S, R and the reserved positions.
    const demo = await step('demo Student', () => findDemoStudent(prisma, studentIds, sanctioned));
    const active = await step('eligible Students', () => activeCohort(prisma, studentIds, sanctioned));
    const eligible = eligibleStudents(active, demo.id);
    log('seed: eligible Students', { eligible: eligible.length });
    const graph = await step('social graph', () => seedSocialGraph(social, prisma, demo.id, eligible));
    log('seed: social graph', graph.counts);
    const likes = await step('Likes', () => seedLikes(feed, prisma, active.map((member) => member.id)));
    log('seed: Likes', likes);
    const threads = await step('Direct Messages', () =>
      seedDirectMessages(messaging, prisma, demo.id, graph.firstFriendId, graph.remaining),
    );
    log('seed: Direct Messages', threads);
    const { reportFixtures, reports } = await step('report fixtures', async () => ({
      reportFixtures: await seedReports(moderation, prisma, eligible, staffIds.peerModeratorId),
      reports: await prisma.report.count(),
    }));
    log('seed: report fixtures', { reports });

    // §14.4 step 6: Prompt 4 stays live and unanswered at completion.
    await step('Prompt 4', () => promptSteps.publish(4));
    log('seed: Prompt published', { prompt: 4 });
    const moderationReads = {
      moderation,
      admin,
      peerModerator: { studentId: staffIds.peerModeratorId, sessionHash: null },
      fixtures: reportFixtures,
    };
    const { demoStudent } = await step('end-state assertions', () =>
      assertEndState(prisma, studentIds, sanctioned, demo, moderationReads),
    );
    log('seed: demo Student', demoStudent);
    await step('completion record', () => writeRecord(db, FIXTURE_VERSION));
    log(`seed complete (fixture-v${FIXTURE_VERSION})`, elapsed());
    return 0;
  } catch (err) {
    logFailure(err);
    return 1;
  } finally {
    // Closing on purpose is no loss; the lock ends with its connection.
    await lock?.release().catch(() => undefined);
    await app?.close().catch(() => undefined);
  }
}

// Validated first: steps 1 and 2 of the boot check (§15.5).
assertEnvOrExit(process.env);
void run().then((code) => process.exit(code));
