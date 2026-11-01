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

export type Sanctioned = { suspendedId: string; removedId: string };

export type SanctionSelection = { studentId: string; matchId: string };

export type SelectionRules = {
  peerModeratorId: string;
  reservedIds: readonly string[];
};

type RemovalRules = SelectionRules & { suspendedId: string; completedMentees: ReadonlySet<string> };

function isLapseIndex(k: number, n: number): boolean {
  return k >= n - 2;
}

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

export async function completedMentees(prisma: PrismaService, roundIds: readonly string[]): Promise<Set<string>> {
  const rows = await prisma.match.findMany({
    where: { roundId: { in: [...roundIds] }, status: 'COMPLETED' },
    select: { menteeId: true },
  });
  return new Set(rows.map((row) => row.menteeId));
}

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

async function readAsset(name: string, mimetype: string): Promise<UploadedPart> {
  return {
    buffer: await readFile(resolve(process.cwd(), 'prisma/seed/assets', name)),
    originalname: name,
    mimetype,
  };
}

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
