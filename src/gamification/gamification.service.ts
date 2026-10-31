import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { UnitOfWork } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { STUDENT_REF_SELECT, toStudentRef } from '../students/student-ref';
import { levelFor, levelProgress } from './level';
import { badgeViews, type LeaderboardView, type ProgressView } from './views';

const ELIGIBLE = {
  role: { in: ['STUDENT', 'PEER_MODERATOR'] },
  suspendedAt: null,
  removedAt: null,
} satisfies Prisma.StudentWhereInput;

@Injectable()
export class GamificationService {
  constructor(private readonly uow: UnitOfWork) {}

  leaderboard(actor: Actor): Promise<LeaderboardView> {
    return this.uow.readOnly(async (tx) => {
      const rows = await tx.student.findMany({
        where: ELIGIBLE,
        orderBy: [{ xp: 'desc' }, { id: 'asc' }],
        take: 10,
        select: { ...STUDENT_REF_SELECT, xp: true },
      });
      const top = rows.map((row, index) => ({
        rank: index + 1,
        student: toStudentRef(row),
        xp: row.xp,
        level: levelFor(row.xp),
      }));
      if (rows.some((row) => row.id === actor.studentId)) return { top, me: null };

      const viewer = await tx.student.findFirst({
        where: { ...ELIGIBLE, id: actor.studentId },
        select: { id: true, xp: true },
      });
      if (viewer === null) return { top, me: null };

      const ahead = await tx.student.count({
        where: {
          ...ELIGIBLE,
          OR: [{ xp: { gt: viewer.xp } }, { xp: viewer.xp, id: { lt: viewer.id } }],
        },
      });
      return { top, me: { rank: ahead + 1, xp: viewer.xp, level: levelFor(viewer.xp) } };
    });
  }

  progress(actor: Actor): Promise<ProgressView> {
    return this.uow.readOnly(async (tx) => {
      const row = await tx.student.findUniqueOrThrow({
        where: { id: actor.studentId },
        select: { xp: true, streak: true, badgeAwards: {
          select: { badge: true, awardedAt: true }, orderBy: [{ awardedAt: 'asc' }, { badge: 'asc' }],
        } },
      });
      return { ...levelProgress(row.xp), streak: row.streak, badges: badgeViews(row.badgeAwards) };
    });
  }
}
