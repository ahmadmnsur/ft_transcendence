import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AdminUsersService } from '../../src/admin/admin-users.service';
import type { Actor } from '../../src/core/actor';
import type { PrismaService } from '../../src/core/prisma.service';
import type { UploadedPart } from '../../src/files/validate';
import type { AdminRoundMatch } from '../../src/matching/views';
import type { EvidenceService } from '../../src/reviews/evidence.service';
import type { AvatarsService } from '../../src/students/avatars.service';
import { SeedFailure } from './failure';

// §14.5's S and R, chosen by its selection rules from the M of Rounds 3
// and 4, just before their sanctions (ADR-0017 d2). Check 5 reads both by id.
export type Sanctioned = { suspendedId: string; removedId: string };

export type SanctionSelection = { studentId: string; matchId: string };

export type SelectionRules = {
  peerModeratorId: string;
  // The Students at §14.3's reserved positions.
  reservedIds: readonly string[];
};

type RemovalRules = SelectionRules & { suspendedId: string; completedMentees: ReadonlySet<string> };

// M[n−1] and M[n−2] lapse (§14.5 step g).
function isLapseIndex(k: number, n: number): boolean {
  return k >= n - 2;
}

// §14.5's S: the Mentee of Round 3's first M[k], k ≥ 2 and not a lapse
// index, who is neither the Peer Moderator nor at a reserved position.
export function selectSuspended(round3: readonly AdminRoundMatch[], rules: SelectionRules): SanctionSelection {
  for (const [k, match] of round3.entries()) {
    if (k < 2 || isLapseIndex(k, round3.length)) continue;
    const mentee = match.mentee.id;
    if (mentee !== rules.peerModeratorId && !rules.reservedIds.includes(mentee)) {
      return { studentId: mentee, matchId: match.id };
    }
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
  rules: RemovalRules,
): SanctionSelection {
  for (const [k, match] of round4.entries()) {
    if (k < 1 || isLapseIndex(k, round4.length)) continue;
    for (const id of [match.mentee.id, match.mentor.id]) {
      if (id === rules.peerModeratorId || rules.reservedIds.includes(id) || id === rules.suspendedId) continue;
      if (rules.completedMentees.has(id)) return { studentId: id, matchId: match.id };
    }
  }
  throw new SeedFailure('no Match of Round 4 has a participant §14.5 can choose as R');
}

// §3.2: the build copies no assets; the working directory is the
// repository root on both targets and in CI.
async function readAsset(name: string, mimetype: string): Promise<UploadedPart> {
  return {
    buffer: await readFile(resolve(process.cwd(), 'prisma/seed/assets', name)),
    originalname: name,
    mimetype,
  };
}

// §14.5 step e: S stays Suspended after their Match is terminated.
export async function suspendS(
  adminUsers: AdminUsersService,
  admin: Actor,
  matches: readonly AdminRoundMatch[],
  rules: SelectionRules,
): Promise<SanctionSelection> {
  const selected = selectSuspended(matches, rules);
  await adminUsers.suspend(admin, selected.studentId);
  return selected;
}

// §14.5 step f: R's uploads precede Removal, which deletes the Avatar and
// preserves the Evidence on their earliest Review (ADR-0017 d5).
export async function removeR(
  { prisma, adminUsers, avatars, evidence }: {
    prisma: PrismaService;
    adminUsers: AdminUsersService;
    avatars: AvatarsService;
    evidence: EvidenceService;
  },
  admin: Actor,
  matches: readonly AdminRoundMatch[],
  rules: RemovalRules,
): Promise<SanctionSelection> {
  const selected = selectRemoved(matches, rules);
  const actor = { studentId: selected.studentId, sessionHash: null };
  await avatars.putAvatar(actor, await readAsset('avatar.png', 'image/png'));
  const review = await prisma.review.findFirst({
    where: { match: { menteeId: selected.studentId } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });
  if (review === null) throw new SeedFailure('R has no Review as Mentee for Evidence');
  await evidence.putEvidence(actor, review.id, await readAsset('evidence.pdf', 'application/pdf'));
  await adminUsers.remove(admin, selected.studentId);
  return selected;
}
