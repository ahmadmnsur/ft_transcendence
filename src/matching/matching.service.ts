import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork } from '../core/uow';
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
  MatchView,
  OpenRoundResult,
} from './views';

// §3.4's `matching` module: `Round`, `Match` and `MatchSkillCoverage`. A
// write method takes an Actor and runs in exactly one `uow.run`; a read
// method runs outside the Unit of Work, in one read-only snapshot when it
// reads more than once (§3.6.2).

// The Match, if `studentId` is its Mentor or its Mentee. To anyone else it does
// not exist: 404, an Admin outside the pair included (§6.6, §8.5).
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

@Injectable()
export class MatchingService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly publisher: RealtimePublisher,
  ) {}

  // §8.6: the same orientation as the matcher, with no history check or
  // floor. The deciding reads share the insert's SSI transaction, so close,
  // eligibility changes and competing creations have one serial order.
  async createHandMadeMatch(actor: Actor, studentIds: readonly [string, string]): Promise<AdminMatchView> {
    // Keep the first attempt's Round across retries: close first refuses
    // creation rather than moving it into a later Round (ADR-0002 d7).
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

  // §8.4. One SSI transaction reads the actor, whether a Round is open, every
  // candidate with Skills, Goal and XP, every Match pair and every Block pair,
  // then writes the Round, its Matches and their coverage rows together: no
  // Round without its Matches (ADR-0002 d3). Zero Matches is legal. Two opens
  // racing: one commits, the other retries, reads the open Round and is
  // refused, with `round_single_open` as the backstop.
  async openRound(actor: Actor): Promise<OpenRoundResult> {
    return this.uow.run(
      { name: 'round-open', uniqueRefusals: { round_single_open: ROUND_ALREADY_OPEN } },
      async (tx, ctx) => {
        await readActiveAdmin(tx, actor.studentId);
        const open = await tx.round.findFirst({ where: { closedAt: null }, select: { id: true } });
        if (open !== null) throw roundAlreadyOpen();
        const pool = await readCandidates(tx);
        // §8.3: every pair with any Match row, any Round, any status, either
        // orientation; every pair with a Block either way.
        const history = await tx.match.findMany({ select: { mentorId: true, menteeId: true } });
        const blocks = await tx.block.findMany({ select: { blockerId: true, blockedId: true } });
        await ctx.checkpoint('round.open');

        const output = runMatcher({
          candidates: pool.map((entry) => entry.candidate),
          history: history.map((row): UnorderedPair => [row.mentorId, row.menteeId]),
          blocked: blocks.map((row): UnorderedPair => [row.blockerId, row.blockedId]),
        });
        const round = await tx.round.create({ data: { openedAt: ctx.now }, select: { id: true, openedAt: true } });
        // In selection order, so each Match takes its index's Mission (§8.10).
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

  // §8.7 steps 1–2. Reads the actor, the open Round and every Match in it, then
  // sets `closed_at` — irreversible — and lapses every Match still in
  // progress, which pays nothing. The Streak and its Badge are the Streak
  // ticket's (#58). A hand-made Match or a Review racing the close lands in one
  // serial order with it (§3.6.3).
  async closeRound(actor: Actor): Promise<CloseRoundResult> {
    return this.uow.run('round-close', async (tx, ctx) => {
      await readActiveAdmin(tx, actor.studentId);
      const round = await tx.round.findFirst({ where: { closedAt: null }, select: { id: true } });
      if (round === null) throw noOpenRound();
      const matches = await tx.match.findMany({ where: { roundId: round.id }, select: { id: true, status: true } });
      const toLapse = matches.filter((match) => isInProgress(match.status)).map((match) => match.id);
      // Establish the answer predicate before closing: an overlapping answer
      // reads this Round and inserts into this set, so SSI retries whichever
      // operation follows the other. Streak calculation joins in the progress slice.
      await tx.post.count({ where: { answerRoundId: round.id } });
      await ctx.checkpoint('round.close');

      await tx.round.update({ where: { id: round.id }, data: { closedAt: ctx.now } });
      if (toLapse.length > 0) {
        await tx.match.updateMany({ where: { id: { in: toLapse } }, data: { status: 'LAPSED' } });
      }
      ctx.afterCommit(() => this.publisher.roundClosed());
      return { roundId: round.id, lapsed: toLapse.length };
    });
  }

  // §8.5, §8.8. Only the pair: anyone else gets 404. On a MATCHED Match it
  // records the actor's acceptance, and the second acceptance makes it
  // ACCEPTED; an acceptance already recorded is the current state again. Any
  // other status is `match_not_pending`. The role is not read: a Match made
  // before the actor's promotion stays theirs to accept (ADR-0008 d2). Two
  // acceptances racing write one row, so one retries and makes the
  // transition. No event: the pair reads the new status on the next load
  // (§7.4). The view is read after the commit.
  async accept(actor: Actor, matchId: string): Promise<MatchView> {
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
    });
    return this.getMatch(actor, matchId);
  }

  // §8.5, §8.8. Only the pair: anyone else gets 404. MATCHED or ACCEPTED
  // becomes DECLINED, naming who declined; anything else is
  // `match_not_in_progress`. Both Students are unmatched again (derived), and
  // nothing searches for a replacement (ADR-0002 d8). No event.
  async decline(actor: Actor, matchId: string): Promise<MatchView> {
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
    });
    return this.getMatch(actor, matchId);
  }

  // §6.6's `GET /api/rounds/current`. `actor` is the signed-in viewer the read
  // is for (§3.4); the answer does not vary by viewer.
  async currentRound(actor: Actor): Promise<CurrentRound> {
    return this.uow.readOnly(async (tx) => {
      const round = await tx.round.findFirst({ where: { closedAt: null }, select: { id: true, openedAt: true } });
      if (round === null) return { round: null };
      return { round: { id: round.id, number: await roundNumberOf(tx, round), openedAt: round.openedAt.toISOString() } };
    });
  }

  // §6.6's `GET /api/matches/current`: the actor's standing Match in the open
  // Round, or null — after a decline the actor is unmatched again. At most
  // one Match per Student per Round stands (§4.3.10); newest first all the
  // same, so a read never depends on that holding.
  async currentMatch(actor: Actor): Promise<CurrentMatch> {
    return this.uow.readOnly(async (tx) => {
      const row = await tx.match.findFirst({
        where: {
          round: { closedAt: null },
          status: { in: [...STANDING_STATUSES] },
          OR: [{ mentorId: actor.studentId }, { menteeId: actor.studentId }],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: MATCH_SELECT,
      });
      if (row === null) return { match: null };
      const people = await readPeople(tx, [row]);
      return { match: toMatchView(row, people, actor.studentId, await roundNumberOf(tx, row.round)) };
    });
  }

  // §6.6's `GET /api/matches?page`: the actor's own Matches, every status,
  // newest first. Only the pair reads a Match (§4.6), so this is the only list
  // of them a Student sees. A page past the last reads no rows.
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

  // §6.6's `GET /api/matches/:id`: the pair only, whatever their current role;
  // anyone else, an Admin outside the pair included, gets 404. Admins read
  // every Match through `getAdminMatch`.
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

  // §6.13's `GET /api/admin/rounds`: every Round, newest first, with its
  // number, times and how many of its Matches are in each status. Only
  // Admins reach it (the role guard); `actor` is that Admin.
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

  // §6.13's `GET /api/admin/rounds/:id`: the Round's Matches in creation
  // order — the matcher's selection order, then hand-made ones — and, for the
  // open Round only, its unmatched Students (§8.9). Unknown → 404.
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

  // §6.13's `GET /api/admin/matches/:id`: any Match, both participants
  // named. Unknown → 404.
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
