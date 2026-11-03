import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { evaluateStreaksAtClose } from '../gamification/streaks';
import { readReview } from '../reviews/read-review';
import { MISSIONS, STANDING_STATUSES, isInProgress } from '../shared/matches';
import { readActiveActor, readActiveAdmin } from '../students/profile-writes';
import { readCandidates, readCandidatesByIds, unmatchedIn } from './candidates';
import { orientPair, runMatcher, type UnorderedPair } from './engine';
import {
  MATCH_SELECT,
  ROUND_MATCH_SELECT,
  emptyCounts,
  readPeople,
  roundNumberOf,
  roundNumbers,
  toAdminMatchView,
  toAdminRoundMatch,
  toMatchView,
} from './match-views';
import {
  ROUND_ALREADY_OPEN,
  alreadyMatched,
  matchNotInProgress,
  matchNotPending,
  noOpenRound,
  notACandidate,
  pairBlocked,
  roundAlreadyOpen,
  sameStudent,
} from './refusals';
import type {
  AdminMatchView,
  AdminMatchDetailView,
  MatchDetailView,
  AdminRoundDetail,
  AdminRoundSummary,
  CloseRoundResult,
  CurrentMatch,
  CurrentRound,
  MatchHistoryPage,
  OpenRoundResult,
} from './views';


function asParticipant<T extends { mentorId: string; menteeId: string }>(row: T | null, studentId: string): T {
  if (row === null || (row.mentorId !== studentId && row.menteeId !== studentId)) {
    throw new ApiError('not_found');
  }
  return row;
}

const PARTICIPANT_SELECT = {
  id: true,
  status: true,
  mentorId: true,
  menteeId: true,
  mentorAcceptedAt: true,
  menteeAcceptedAt: true,
} as const;

export function currentMatchWhere(studentId: string): Prisma.MatchWhereInput {
  return {
    round: { closedAt: null },
    status: { in: [...STANDING_STATUSES] },
    OR: [{ mentorId: studentId }, { menteeId: studentId }],
  };
}

@Injectable()
export class MatchingService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly publisher: RealtimePublisher,
  ) {}

  async createHandMadeMatch(actor: Actor, studentIds: readonly [string, string]): Promise<AdminMatchView> {
    let firstRoundId: string | undefined;
    return this.uow.run('match-handmade', async (tx, ctx) => {
      await readActiveAdmin(tx, actor.studentId);
      const round = await tx.round.findFirst({ where: { closedAt: null }, select: { id: true, openedAt: true } });
      if (round === null || (firstRoundId !== undefined && round.id !== firstRoundId)) throw noOpenRound();
      firstRoundId = round.id;
      const [a, b] = studentIds.map((id) => id.toLowerCase());
      if (a === b) throw sameStudent();
      const candidates = await readCandidatesByIds(tx, [a, b]);
      if (candidates.length !== 2) throw notACandidate();
      const standing = await tx.match.findFirst({
        where: {
          roundId: round.id,
          status: { in: [...STANDING_STATUSES] },
          OR: [{ mentorId: { in: [a, b] } }, { menteeId: { in: [a, b] } }],
        },
        select: { id: true },
      });
      if (standing !== null) throw alreadyMatched();
      const block = await tx.block.findFirst({
        where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
        select: { id: true },
      });
      if (block !== null) throw pairBlocked();
      const count = await tx.match.count({ where: { roundId: round.id } });
      await ctx.checkpoint('match.handmade');

      const oriented = orientPair(candidates[0], candidates[1]);
      const row = await tx.match.create({
        data: {
          roundId: round.id,
          mentorId: oriented.mentorId,
          menteeId: oriented.menteeId,
          status: 'MATCHED',
          compatibilityScore: null,
          goalBonusApplied: oriented.goalBonusApplied,
          mission: MISSIONS[count % MISSIONS.length],
          coverage: {
            createMany: {
              data: [
                ...oriented.forward.map((skillId) => ({ skillId, direction: 'FORWARD' as const })),
                ...oriented.reverse.map((skillId) => ({ skillId, direction: 'REVERSE' as const })),
              ],
            },
          },
        },
        select: MATCH_SELECT,
      });
      const people = await readPeople(tx, [row]);
      const number = await roundNumberOf(tx, round);
      ctx.afterCommit(() => this.publisher.matchReady([oriented.mentorId, oriented.menteeId]));
      return toAdminMatchView(row, people, number);
    });
  }

  async openRound(actor: Actor): Promise<OpenRoundResult> {
    return this.uow.run(
      { name: 'round-open', uniqueRefusals: { round_single_open: ROUND_ALREADY_OPEN } },
      async (tx, ctx) => {
        await readActiveAdmin(tx, actor.studentId);
        const open = await tx.round.findFirst({ where: { closedAt: null }, select: { id: true } });
        if (open !== null) throw roundAlreadyOpen();
        const pool = await readCandidates(tx);
        const history = await tx.match.findMany({ select: { mentorId: true, menteeId: true } });
        const blocks = await tx.block.findMany({ select: { blockerId: true, blockedId: true } });
        await ctx.checkpoint('round.open');

        const output = runMatcher({
          candidates: pool.map((entry) => entry.candidate),
          history: history.map((row): UnorderedPair => [row.mentorId, row.menteeId]),
          blocked: blocks.map((row): UnorderedPair => [row.blockerId, row.blockedId]),
        });
        const round = await tx.round.create({ data: { openedAt: ctx.now }, select: { id: true, openedAt: true } });
        for (const item of output) {
          await tx.match.create({
            data: {
              roundId: round.id,
              mentorId: item.mentorId,
              menteeId: item.menteeId,
              status: 'MATCHED',
              mission: MISSIONS[item.index % MISSIONS.length],
              compatibilityScore: item.score,
              goalBonusApplied: item.goalBonusApplied,
              coverage: {
                createMany: {
                  data: [
                    ...item.forward.map((skillId) => ({ skillId, direction: 'FORWARD' as const })),
                    ...item.reverse.map((skillId) => ({ skillId, direction: 'REVERSE' as const })),
                  ],
                },
              },
            },
            select: { id: true },
          });
        }
        const number = await roundNumberOf(tx, round);

        const matched = output.flatMap((item) => [item.mentorId, item.menteeId]);
        const matchedSet = new Set(matched);
        ctx.afterCommit(() => this.publisher.roundOpened());
        if (matched.length > 0) ctx.afterCommit(() => this.publisher.matchReady(matched));
        return {
          round: { id: round.id, number },
          matchCount: output.length,
          unmatched: pool.filter((entry) => !matchedSet.has(entry.ref.id)).map((entry) => entry.ref),
        };
      },
    );
  }

  async closeRound(actor: Actor): Promise<CloseRoundResult> {
    return this.uow.run('round-close', async (tx, ctx) => {
      await readActiveAdmin(tx, actor.studentId);
      const round = await tx.round.findFirst({ where: { closedAt: null }, select: { id: true } });
      if (round === null) throw noOpenRound();
      const matches = await tx.match.findMany({
        where: { roundId: round.id }, select: { id: true, status: true, mentorId: true, menteeId: true },
      });
      const toLapse = matches.filter((match) => isInProgress(match.status)).map((match) => match.id);
      const students = await tx.student.findMany({
        select: { id: true, role: true, suspendedAt: true, removedAt: true, streak: true },
      });
      const answers = await tx.post.findMany({
        where: { answerRoundId: round.id, promptId: { not: null } }, select: { authorId: true },
      });
      const qualifying = new Set(answers.map((answer) => answer.authorId));
      for (const match of matches) {
        if (match.status === 'COMPLETED') {
          qualifying.add(match.mentorId);
          qualifying.add(match.menteeId);
        }
      }
      await ctx.checkpoint('round.close');

      await tx.round.update({ where: { id: round.id }, data: { closedAt: ctx.now } });
      if (toLapse.length > 0) {
        await tx.match.updateMany({ where: { id: { in: toLapse } }, data: { status: 'LAPSED' } });
      }
      const streaks = await evaluateStreaksAtClose(tx, students, qualifying, ctx.now);
      ctx.afterCommit(() => this.publisher.roundClosed());
      return { roundId: round.id, lapsed: toLapse.length, ...streaks };
    });
  }

  async accept(actor: Actor, matchId: string): Promise<MatchDetailView> {
    await this.uow.run('match-accept', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const match = asParticipant(
        await tx.match.findUnique({ where: { id: matchId }, select: PARTICIPANT_SELECT }),
        actor.studentId,
      );
      const asMentor = match.mentorId === actor.studentId;
      const mine = asMentor ? match.mentorAcceptedAt : match.menteeAcceptedAt;
      const theirs = asMentor ? match.menteeAcceptedAt : match.mentorAcceptedAt;
      const repeat = mine !== null && isInProgress(match.status);
      if (!repeat && match.status !== 'MATCHED') throw matchNotPending();
      await ctx.checkpoint('match.accept');
      if (repeat) return;
      await tx.match.update({
        where: { id: match.id },
        data: {
          ...(asMentor ? { mentorAcceptedAt: ctx.now } : { menteeAcceptedAt: ctx.now }),
          ...(theirs !== null ? { status: 'ACCEPTED' as const } : {}),
        },
      });
      ctx.afterCommit(() => this.publisher.matchChanged([match.mentorId, match.menteeId]));
    });
    return this.getMatch(actor, matchId);
  }

  async decline(actor: Actor, matchId: string): Promise<MatchDetailView> {
    await this.uow.run('match-decline', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const match = asParticipant(
        await tx.match.findUnique({ where: { id: matchId }, select: PARTICIPANT_SELECT }),
        actor.studentId,
      );
      if (!isInProgress(match.status)) throw matchNotInProgress();
      await ctx.checkpoint('match.decline');
      await tx.match.update({
        where: { id: match.id },
        data: { status: 'DECLINED', declinedById: actor.studentId },
      });
      ctx.afterCommit(() => this.publisher.matchChanged([match.mentorId, match.menteeId]));
    });
    return this.getMatch(actor, matchId);
  }

  async currentRound(actor: Actor): Promise<CurrentRound> {
    return this.uow.readOnly(async (tx) => {
      const round = await tx.round.findFirst({ where: { closedAt: null }, select: { id: true, openedAt: true } });
      if (round === null) return { round: null };
      return { round: { id: round.id, number: await roundNumberOf(tx, round), openedAt: round.openedAt.toISOString() } };
    });
  }

  async currentMatch(actor: Actor): Promise<CurrentMatch> {
    return this.uow.readOnly(async (tx) => {
      const row = await tx.match.findFirst({
        where: currentMatchWhere(actor.studentId),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: MATCH_SELECT,
      });
      if (row === null) return { match: null };
      const people = await readPeople(tx, [row]);
      return { match: toMatchView(row, people, actor.studentId, await roundNumberOf(tx, row.round)) };
    });
  }

  async history(actor: Actor, page: number, pageSize: number): Promise<MatchHistoryPage> {
    const where = { OR: [{ mentorId: actor.studentId }, { menteeId: actor.studentId }] };
    return this.uow.readOnly(async (tx) => {
      const total = await tx.match.count({ where });
      const skip = (page - 1) * pageSize;
      if (skip >= total) return { items: [], total };
      const rows = await tx.match.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: MATCH_SELECT,
      });
      const people = await readPeople(tx, rows);
      const numbers = await roundNumbers(tx);
      return {
        items: rows.map((row) => toMatchView(row, people, actor.studentId, numbers.get(row.round.id) ?? 0)),
        total,
      };
    });
  }

  async getMatch(actor: Actor, matchId: string): Promise<MatchDetailView> {
    return this.uow.readOnly(async (tx) => {
      const row = await tx.match.findUnique({ where: { id: matchId }, select: MATCH_SELECT });
      const own = asParticipant(row, actor.studentId);
      const people = await readPeople(tx, [own]);
      return {
        ...toMatchView(own, people, actor.studentId, await roundNumberOf(tx, own.round)),
        ...await readReview(tx, matchId),
      };
    });
  }

  async listRounds(actor: Actor): Promise<{ items: AdminRoundSummary[] }> {
    return this.uow.readOnly(async (tx) => {
      const rounds = await tx.round.findMany({
        orderBy: [{ openedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, openedAt: true, closedAt: true },
      });
      const groups = await tx.match.groupBy({ by: ['roundId', 'status'], _count: { _all: true } });
      return {
        items: rounds.map((round, index) => {
          const counts = emptyCounts();
          for (const group of groups) {
            if (group.roundId === round.id) counts[group.status] = group._count._all;
          }
          return {
            id: round.id,
            number: rounds.length - index,
            openedAt: round.openedAt.toISOString(),
            closedAt: round.closedAt?.toISOString() ?? null,
            counts,
          };
        }),
      };
    });
  }

  async getRound(actor: Actor, roundId: string): Promise<AdminRoundDetail> {
    return this.uow.readOnly(async (tx) => {
      const round = await tx.round.findUnique({
        where: { id: roundId },
        select: { id: true, openedAt: true, closedAt: true },
      });
      if (round === null) throw new ApiError('not_found');
      const matches = await tx.match.findMany({
        where: { roundId: round.id },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: ROUND_MATCH_SELECT,
      });
      return {
        round: {
          id: round.id,
          number: await roundNumberOf(tx, round),
          openedAt: round.openedAt.toISOString(),
          closedAt: round.closedAt?.toISOString() ?? null,
        },
        matches: matches.map(toAdminRoundMatch),
        unmatched: round.closedAt === null ? await unmatchedIn(tx, round.id) : null,
      };
    });
  }

  async getAdminMatch(actor: Actor, matchId: string): Promise<AdminMatchDetailView> {
    return this.uow.readOnly(async (tx) => {
      const row = await tx.match.findUnique({ where: { id: matchId }, select: MATCH_SELECT });
      if (row === null) throw new ApiError('not_found');
      const people = await readPeople(tx, [row]);
      return {
        ...toAdminMatchView(row, people, await roundNumberOf(tx, row.round)),
        ...await readReview(tx, matchId),
      };
    });
  }
}
