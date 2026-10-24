import type { PrismaService } from '../../src/core/prisma.service';
import type { AdminRoundMatch } from '../../src/matching/views';
import { SeedFailure } from './failure';

// §14.5's S and R, chosen by its selection rules over the Round script, not
// by a sanction (ADR-0017 d2). This fixture version applies neither sanction,
// so wherever §14.6 says "Active" the seed counts S and R out as well, as the
// complete script will have them by §14.4 step 5.
export type Sanctioned = { suspendedId: string; removedId: string };

export function isSanctioned(sanctioned: Sanctioned, studentId: string): boolean {
  return studentId === sanctioned.suspendedId || studentId === sanctioned.removedId;
}

export type SelectionRules = {
  peerModeratorId: string;
  // The Students at §14.3's reserved positions.
  reservedIds: readonly string[];
};

// M[n−1] and M[n−2] lapse (§14.5 step g).
function isLapseIndex(k: number, n: number): boolean {
  return k >= n - 2;
}

// §14.5's S: the Mentee of Round 3's first M[k], k ≥ 2 and not a lapse
// index, who is neither the Peer Moderator nor at a reserved position.
export function selectSuspended(round3: readonly AdminRoundMatch[], rules: SelectionRules): string {
  for (const [k, match] of round3.entries()) {
    if (k < 2 || isLapseIndex(k, round3.length)) continue;
    const mentee = match.mentee.id;
    if (mentee !== rules.peerModeratorId && !rules.reservedIds.includes(mentee)) return mentee;
  }
  throw new SeedFailure('no Match of Round 3 has a Mentee §14.5 can choose as S');
}

// The Mentees of the COMPLETED Matches of the given Rounds: R must hold one
// from Rounds 1–3.
export async function completedMentees(prisma: PrismaService, roundIds: readonly string[]): Promise<Set<string>> {
  const rows = await prisma.match.findMany({
    where: { roundId: { in: [...roundIds] }, status: 'COMPLETED' },
    select: { menteeId: true },
  });
  return new Set(rows.map((row) => row.menteeId));
}

// §14.5's R: the first participant, the Mentee before the Mentor, of Round
// 4's M[k], k ≥ 1 and not a lapse index, who is not the Peer Moderator, not
// reserved, not S, and holds a COMPLETED Match as Mentee from Rounds 1–3.
export function selectRemoved(
  round4: readonly AdminRoundMatch[],
  rules: SelectionRules & { suspendedId: string; completedMentees: ReadonlySet<string> },
): string {
  for (const [k, match] of round4.entries()) {
    if (k < 1 || isLapseIndex(k, round4.length)) continue;
    for (const id of [match.mentee.id, match.mentor.id]) {
      if (id === rules.peerModeratorId || rules.reservedIds.includes(id) || id === rules.suspendedId) continue;
      if (rules.completedMentees.has(id)) return id;
    }
  }
  throw new SeedFailure('no Match of Round 4 has a participant §14.5 can choose as R');
}
