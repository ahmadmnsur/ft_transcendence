import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { UnitOfWork } from '../core/uow';
import { levelProgress } from './level';
import { badgeViews, type ProgressView } from './views';

@Injectable()
export class GamificationService {
  constructor(private readonly uow: UnitOfWork) {}

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
