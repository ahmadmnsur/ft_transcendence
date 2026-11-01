import type { Actor } from '../../src/core/actor';
import { Refusal } from '../../src/core/errors';
import type { MatchingService } from '../../src/matching/matching.service';
import type { AdminRoundMatch, MatchDetailView, StatusCounts } from '../../src/matching/views';
import { MATCH_STATUSES, type MatchRole } from '../../src/shared/matches';
import { SeedFailure } from './failure';
import type { PromptScript } from './prompts';
import type { SubmitReview } from './reviews';

const DECLINES = [
  ['MENTEE', 'MENTOR'],
  ['MENTEE'],
  ['MENTEE', 'MENTOR'],
  ['MENTOR'],
] as const satisfies readonly (readonly MatchRole[])[];

export const ROUND_TARGETS = [
  { matcherMatches: 15, COMPLETED: 12, LAPSED: 2, DECLINED: 2, TERMINATED_BY_ADMIN: 0 },
  { matcherMatches: 15, COMPLETED: 12, LAPSED: 2, DECLINED: 1, TERMINATED_BY_ADMIN: 0 },
  { matcherMatches: 15, COMPLETED: 11, LAPSED: 2, DECLINED: 2, TERMINATED_BY_ADMIN: 1 },
  { matcherMatches: 15, COMPLETED: 11, LAPSED: 2, DECLINED: 1, TERMINATED_BY_ADMIN: 1 },
] as const;

export function matchDistribution(roundCounts: readonly Partial<StatusCounts>[]) {
  const counts = Object.fromEntries(MATCH_STATUSES.map((status) => [status, 0])) as StatusCounts;
  for (const round of roundCounts) {
    for (const status of MATCH_STATUSES) counts[status] += round[status] ?? 0;
  }
  const matches = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return { counts, matches, completionPercent: Math.round(100 * counts.COMPLETED / matches) };
}

async function acceptBoth(matching: MatchingService, match: AdminRoundMatch): Promise<MatchDetailView> {
  await matching.accept({ studentId: match.mentor.id, sessionHash: null }, match.id);
  return matching.accept({ studentId: match.mentee.id, sessionHash: null }, match.id);
}

async function complete(
  matching: MatchingService,
  submitReview: SubmitReview,
  match: AdminRoundMatch,
): Promise<void> {
  const menteeView = await acceptBoth(matching, match);
  await submitReview({ studentId: match.mentee.id, sessionHash: null }, menteeView);
}

async function repair(
  matching: MatchingService,
  submitReview: SubmitReview,
  admin: Actor,
  first: AdminRoundMatch,
  second: AdminRoundMatch,
): Promise<void> {
  const pairs: readonly (readonly [string, string])[] = [
    [first.mentee.id, second.mentor.id],
    [first.mentor.id, second.mentee.id],
    [first.mentee.id, second.mentee.id],
    [first.mentor.id, second.mentor.id],
  ];
  for (const pair of pairs) {
    let match;
    try {
      match = await matching.createHandMadeMatch(admin, pair);
    } catch (err) {
      if (err instanceof Refusal) continue;
      throw err;
    }
    await complete(matching, submitReview, match);
    return;
  }
  throw new SeedFailure('no hand-made repair accepted any of the four pairs');
}

export type SeededRound = Awaited<ReturnType<typeof seedRound>>;

export type SanctionStep = (matches: readonly AdminRoundMatch[]) => Promise<string>;

export async function seedRound(
  matching: MatchingService,
  submitReview: SubmitReview,
  afterOpen: PromptScript['afterOpen'],
  admin: Actor,
  number: number,
  sanction?: SanctionStep,
) {
  const declines = DECLINES[number - 1];
  if (declines === undefined) throw new SeedFailure('the per-Round script only covers Rounds 1–4');
  const opened = await matching.openRound(admin);
  const prompts = await afterOpen(number);
  const { matches } = await matching.getRound(admin, opened.round.id);
  if (matches.length < declines.length + 2) {
    throw new SeedFailure(`Round ${number} has too few matcher Matches for its declines and lapses`);
  }
  for (const [index, role] of declines.entries()) {
    const match = matches[index];
    const studentId = role === 'MENTOR' ? match.mentor.id : match.mentee.id;
    await matching.decline({ studentId, sessionHash: null }, match.id);
  }
  const hasRepair = number === 1 || number === 3;
  if (hasRepair) await repair(matching, submitReview, admin, matches[0], matches[1]);

  const terminatedMatchId = await sanction?.(matches);

  await acceptBoth(matching, matches[matches.length - 1]);
  const mentorOnly = matches[matches.length - 2];
  await matching.accept({ studentId: mentorOnly.mentor.id, sessionHash: null }, mentorOnly.id);

  for (const match of matches.slice(declines.length, -2)) {
    if (match.id === terminatedMatchId) continue;
    await complete(matching, submitReview, match);
  }
  await matching.closeRound(admin);

  const { items } = await matching.listRounds(admin);
  const closed = items.find((round) => round.id === opened.round.id);
  if (closed === undefined) throw new SeedFailure(`Round ${number} is missing after close`);
  if (closed.number !== number) {
    throw new SeedFailure(`Round ${number} shows as Round ${closed.number}: its opening time sorts out of order`);
  }
  if (closed.closedAt !== null && Date.parse(closed.closedAt) < Date.parse(closed.openedAt)) {
    throw new SeedFailure(`Round ${number} closes before it opens: the clock stepped back while it was open`);
  }
  return {
    roundId: opened.round.id,
    matches,
    distribution: { number, matcherMatches: matches.length, repairs: hasRepair ? 1 : 0, counts: closed.counts, prompts },
  };
}
