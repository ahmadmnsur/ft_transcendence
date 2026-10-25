import type { Actor } from '../../src/core/actor';
import { Refusal } from '../../src/core/errors';
import type { MatchingService } from '../../src/matching/matching.service';
import type { AdminRoundMatch, MatchDetailView, StatusCounts } from '../../src/matching/views';
import { MATCH_STATUSES, type MatchRole } from '../../src/shared/matches';
import { SeedFailure } from './failure';
import type { PromptScript } from './prompts';
import type { SubmitReview } from './reviews';

// §14.5 step c, in Round order. Each entry acts on M[0], then M[1]
// when present. The snapshot of M precedes every decline and repair.
const DECLINES = [
  ['MENTEE', 'MENTOR'],
  ['MENTEE'],
  ['MENTEE', 'MENTOR'],
  ['MENTOR'],
] as const satisfies readonly (readonly MatchRole[])[];

// §14.5's full-fixture targets, reported beside the actual counts, never
// asserted: the matcher determines how many Matches each Round holds.
export const ROUND_TARGETS = [
  { matcherMatches: 15, COMPLETED: 12, LAPSED: 2, DECLINED: 2, TERMINATED_BY_ADMIN: 0 },
  { matcherMatches: 15, COMPLETED: 12, LAPSED: 2, DECLINED: 1, TERMINATED_BY_ADMIN: 0 },
  { matcherMatches: 15, COMPLETED: 11, LAPSED: 2, DECLINED: 2, TERMINATED_BY_ADMIN: 1 },
  { matcherMatches: 15, COMPLETED: 11, LAPSED: 2, DECLINED: 1, TERMINATED_BY_ADMIN: 1 },
] as const;

// §14.8 check 2: actual counts and §14.5's targets share totals and rounding.
// The targets omit the in-progress statuses of a closed Round.
export function matchDistribution(roundCounts: readonly Partial<StatusCounts>[]) {
  const counts = Object.fromEntries(MATCH_STATUSES.map((status) => [status, 0])) as StatusCounts;
  for (const round of roundCounts) {
    for (const status of MATCH_STATUSES) counts[status] += round[status] ?? 0;
  }
  const matches = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return { counts, matches, completionPercent: Math.round(100 * counts.COMPLETED / matches) };
}

// Returns the Mentee's view, read after its acceptance.
async function acceptBoth(matching: MatchingService, match: AdminRoundMatch): Promise<MatchDetailView> {
  await matching.accept({ studentId: match.mentor.id, sessionHash: null }, match.id);
  return matching.accept({ studentId: match.mentee.id, sessionHash: null }, match.id);
}

// Both accept, then the Mentee reviews, completing the Match (§14.5 steps d
// and h).
async function complete(
  matching: MatchingService,
  submitReview: SubmitReview,
  match: AdminRoundMatch,
): Promise<void> {
  const menteeView = await acceptBoth(matching, match);
  await submitReview({ studentId: match.mentee.id, sessionHash: null }, menteeView);
}

// §14.5 step d. Only a pair refused by the application is tried again;
// infrastructure and protocol failures stop the seed. A repair is completed
// immediately, at its place in the script, before the remaining Matches, so
// its Review precedes the Round's step-h Reviews.
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

// Steps e and f act on the same M as the rest of the script, returning the
// terminated Match so step h leaves it untouched (§14.5).
export type SanctionStep = (matches: readonly AdminRoundMatch[]) => Promise<string>;

// §14.5 steps a–i. The application's Round detail is in creation order:
// the matcher's selection order before repairs. No seed write sets a Match
// status or fabricates coverage. Returns the Round's id and M, the snapshot
// its script ran on, beside what the seed logs.
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
  // The two lapse indices must be separate from the declines. Fewer
  // Matches cannot run this script; adding pairs to fill it is forbidden.
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

  // Step g: M[n−1] both accept; M[n−2] only the Mentor accepts.
  await acceptBoth(matching, matches[matches.length - 1]);
  const mentorOnly = matches[matches.length - 2];
  await matching.accept({ studentId: mentorOnly.mentor.id, sessionHash: null }, mentorOnly.id);

  // Step h: selection order, excluding declines, sanctions and the two lapse indices.
  for (const match of matches.slice(declines.length, -2)) {
    if (match.id === terminatedMatchId) continue;
    await complete(matching, submitReview, match);
  }
  await matching.closeRound(admin);

  const { items } = await matching.listRounds(admin);
  const closed = items.find((round) => round.id === opened.round.id);
  if (closed === undefined) throw new SeedFailure(`Round ${number} is missing after close`);
  // §4.3.9 numbers Rounds by (opened_at, id); opened_at comes from the clock.
  // A clock step back while seeding can swap Round numbers or make one close
  // before it opens. Stop before recording so the next boot retries (§14.9).
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
