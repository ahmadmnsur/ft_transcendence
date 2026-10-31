import type { PrismaTx } from '../core/uow';
import { levelProgress } from './level';
import type { EarnResult } from './views';

export async function awardMatchXp(
  tx: PrismaTx, mentorId: string, menteeId: string, now: Date,
): Promise<EarnResult> {
  await tx.student.update({ where: { id: mentorId }, data: { xp: { increment: 80 } } });
  const mentee = await tx.student.update({
    where: { id: menteeId }, data: { xp: { increment: 120 } }, select: { xp: true },
  });
  await tx.badgeAward.createMany({
    data: [{ studentId: mentorId, badge: 'FIRST_MENTOR', awardedAt: now }],
    skipDuplicates: true,
  });
  return { ...levelProgress(mentee.xp), xpAwarded: 120, badgesAwarded: [] };
}

export async function awardPromptXp(
  tx: PrismaTx, studentId: string, promptPostCount: number, now: Date,
): Promise<EarnResult> {
  const student = await tx.student.update({
    where: { id: studentId }, data: { xp: { increment: 20 } }, select: { xp: true },
  });
  const inserted = promptPostCount >= 3 ? await tx.badgeAward.createMany({
    data: [{ studentId, badge: 'KNOWLEDGE_SHARER', awardedAt: now }],
    skipDuplicates: true,
  }) : { count: 0 };
  return {
    ...levelProgress(student.xp), xpAwarded: 20,
    badgesAwarded: inserted.count === 1 ? ['KNOWLEDGE_SHARER'] : [],
  };
}
