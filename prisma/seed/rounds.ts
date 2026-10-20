import type { Actor } from '../../src/core/actor';
import { Refusal } from '../../src/core/errors';
import type { MatchingService } from '../../src/matching/matching.service';
import type { AdminRoundMatch } from '../../src/matching/views';
import type { MatchRole } from '../../src/shared/matches';
import { SeedFailure } from './failure';

// §14.5 step c, in Round order. Each entry acts on M[0], then M[1]
// when present. The snapshot of M precedes every decline and repair.
const DECLINES = [
  ['MENTEE', 'MENTOR'],
  ['MENTEE'],
  ['MENTEE', 'MENTOR'],
  ['MENTOR'],
] as const satisfies readonly (readonly MatchRole[])[];

// §14.5's full-fixture targets, reported beside the actual counts, never
// asserted. Until Reviews and sanctions join, accepted Matches lapse.
export const ROUND_TARGETS = [
  { matcherMatches: 15, COMPLETED: 12, LAPSED: 2, DECLINED: 2, TERMINATED_BY_ADMIN: 0 },
  { matcherMatches: 15, COMPLETED: 12, LAPSED: 2, DECLINED: 1, TERMINATED_BY_ADMIN: 0 },
  { matcherMatches: 15, COMPLETED: 11, LAPSED: 2, DECLINED: 2, TERMINATED_BY_ADMIN: 1 },
  { matcherMatches: 15, COMPLETED: 11, LAPSED: 2, DECLINED: 1, TERMINATED_BY_ADMIN: 1 },
] as const;

async function acceptBoth(matching: MatchingService, match: AdminRoundMatch): Promise<void> {
  await matching.accept({ studentId: match.mentor.id, sessionHash: null }, match.id);
  await matching.accept({ studentId: match.mentee.id, sessionHash: null }, match.id);
}

// §14.5 step d. Only a pair refused by the application is tried again;
// infrastructure and protocol failures stop the seed. A repair is accepted
// immediately, at its place in the script, before the remaining Matches.
async function repair(
  matching: MatchingService,
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
    await acceptBoth(matching, match);
    return;
  }
  throw new SeedFailure('no hand-made repair accepted any of the four pairs');
}

// §14.5 steps a, c, d, g, h (acceptances) and i. The application's Round
// detail is in creation order: the matcher's selection order before repairs.
// No seed write sets a Match status or fabricates coverage.
export async function seedRound(matching: MatchingService, admin: Actor, number: number) {
  const declines = DECLINES[number - 1];
  if (declines === undefined) throw new SeedFailure('the per-Round script only covers Rounds 1–4');
  const opened = await matching.openRound(admin);
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
  if (hasRepair) await repair(matching, admin, matches[0], matches[1]);

  // Step g: M[n−1] both accept; M[n−2] only the Mentor accepts.
  await acceptBoth(matching, matches[matches.length - 1]);
  const mentorOnly = matches[matches.length - 2];
  await matching.accept({ studentId: mentorOnly.mentor.id, sessionHash: null }, mentorOnly.id);

  // Step h: selection order, excluding declines and the two lapse indices.
  for (const match of matches.slice(declines.length, -2)) await acceptBoth(matching, match);
  await matching.closeRound(admin);

  const { items } = await matching.listRounds(admin);
  const closed = items.find((round) => round.id === opened.round.id);
  if (closed === undefined) throw new SeedFailure(`Round ${number} is missing after close`);
  return { number, matcherMatches: matches.length, repairs: hasRepair ? 1 : 0, counts: closed.counts };
}
