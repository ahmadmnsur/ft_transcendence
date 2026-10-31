import 'reflect-metadata';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AdminUsersService } from '../../src/admin/admin-users.service';
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
import { EvidenceService } from '../../src/reviews/evidence.service';
import { ReviewsService } from '../../src/reviews/reviews.service';
import { SocialService } from '../../src/social/social.service';
import { AvatarsService } from '../../src/students/avatars.service';
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
import { matchDistribution, ROUND_TARGETS, seedRound, type SanctionStep, type SeededRound } from './rounds';
import { completedMentees, removeR, suspendS } from './sanctioned';
import { SeedModule } from './seed.module';
import { activeCohort, eligibleStudents, seedDirectMessages, seedLikes, seedSocialGraph } from './social';

async function setBuckets(storage: SupabaseStorageClient): Promise<BucketStepResult> {
  try {
    return await ensureBuckets(storage, PRODUCTION_BUCKETS);
  } catch (err) {
    throw err instanceof BucketStepError ? new SeedFailure(err.message) : err;
  }
}


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
    throw err instanceof StepFailed ? err : new StepFailed(name, err);
  }
}

function valueFreeCode(err: unknown): { errorCode: string } | Record<string, never> {
  if (err instanceof Refusal || err instanceof ApiError) return { errorCode: err.code };
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code !== 'string' || /^P\d{4}$/.test(code)) return {};
  return /^[0-9A-Z]{5}$/.test(code) || /^E[A-Z0-9_]+$/.test(code) ? { errorCode: code } : {};
}

function logFailure(err: unknown): void {
  const name = err instanceof StepFailed ? err.step : 'unknown';
  const reason = err instanceof StepFailed ? err.reason : err;
  const detail =
    reason instanceof SeedFailure
      ? { reason: reason.message }
      : { ...errorFields(reason), ...valueFreeCode(reason) };
  logger.entry('error', { message: 'seed failed', step: name, ...detail, ...elapsed() });
}

function lockLost(): void {
  logFailure(new StepFailed('lock', new SeedFailure('the lock connection was lost')));
  process.exit(1);
}

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
    const adminUsers = app.get(AdminUsersService);
    const avatars = app.get(AvatarsService);
    const evidence = app.get(EvidenceService);

    const buckets = await step('buckets', () => setBuckets(storage));
    log('seed: buckets', buckets);

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

    await step('guard', () => assertOnlySeedAccounts(prisma, process.env, remedy.foreignAccounts));
    if (recordedVersion !== null) {
      await step('clear stale record', () => clearRecord(db));
      log('seed: stale record cleared', { fixture: `v${recordedVersion}` });
    }
    const emptied = await step('empty', () => emptyEverything(db, supabase, storage));
    log('seed: emptied', emptied);

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

    await step('X Blocks Y', () => social.block(
      { studentId: studentIds[X_POSITION], sessionHash: null }, studentIds[Y_POSITION],
    ));
    log('seed: X Blocks Y');
    const admin = { studentId: staffIds.adminId, sessionHash: null };
    const promptSteps = promptScript(prompts, prisma, admin, studentIds, staffIds.peerModeratorId);
    await step('Prompt 1', () => promptSteps.publish(1));
    log('seed: Prompt published', { prompt: 1 });
    const submitReview = submitReviewsInOrder(reviews);
    const rounds: SeededRound[] = [];
    const rules = {
      peerModeratorId: staffIds.peerModeratorId,
      reservedIds: RESERVED_POSITIONS.map((position) => studentIds[position]),
    };
    let suspendedId: string | undefined;
    let removedId: string | undefined;

    const suspension: SanctionStep = (matches) => step('S suspension', async () => {
      const { studentId, matchId } = await suspendS(adminUsers, admin, matches, rules);
      suspendedId = studentId;
      log('seed: S suspended', { position: studentIds.indexOf(studentId) });
      return matchId;
    });
    const removal: SanctionStep = (matches) => step('R removal', async () => {
      if (suspendedId === undefined) throw new SeedFailure('S must be suspended before R is chosen');
      const menteesInRounds1to3 = await completedMentees(prisma, rounds.slice(0, 3).map((round) => round.roundId));
      const { studentId, matchId } = await removeR(
        { prisma, adminUsers, avatars, evidence },
        admin,
        matches,
        { ...rules, suspendedId, completedMentees: menteesInRounds1to3 },
      );
      removedId = studentId;
      log('seed: R removed', { position: studentIds.indexOf(studentId) });
      return matchId;
    });

    for (let number = 1; number <= 4; number += 1) {
      const sanction = number === 3 ? suspension : number === 4 ? removal : undefined;
      const round = await step(`Round ${number}`, () =>
        seedRound(matching, submitReview, promptSteps.afterOpen, admin, number, sanction),
      );
      log('seed: Round closed', {
        ...round.distribution,
        fullFixtureTarget: ROUND_TARGETS[number - 1],
      });
      rounds.push(round);
    }

    if (suspendedId === undefined || removedId === undefined) {
      throw new SeedFailure('the four Rounds must suspend S and remove R');
    }
    const sanctioned = { suspendedId, removedId };

    const demo = await step('demo Student', () => findDemoStudent(prisma, studentIds));
    const active = await step('eligible Students', () => activeCohort(prisma, studentIds));
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

    const distribution = matchDistribution(rounds.map((round) => round.distribution.counts));
    const target = matchDistribution(ROUND_TARGETS);
    log('seed: Match distribution', {
      ...distribution,
      target: {
        matches: target.matches,
        COMPLETED: target.counts.COMPLETED,
        LAPSED: target.counts.LAPSED,
        DECLINED: target.counts.DECLINED,
        TERMINATED_BY_ADMIN: target.counts.TERMINATED_BY_ADMIN,
        completionPercent: target.completionPercent,
      },
      ...elapsed(),
    });
    await step('completion record', () => writeRecord(db, FIXTURE_VERSION));
    log(`seed complete (fixture-v${FIXTURE_VERSION})`, elapsed());
    return 0;
  } catch (err) {
    logFailure(err);
    return 1;
  } finally {
    await lock?.release().catch(() => undefined);
    await app?.close().catch(() => undefined);
  }
}

assertEnvOrExit(process.env);
void run().then((code) => process.exit(code));
