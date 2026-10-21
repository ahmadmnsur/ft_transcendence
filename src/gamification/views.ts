import type { Badge } from '../generated/prisma/client';
import type { levelProgress } from './level';

export type LevelProgress = ReturnType<typeof levelProgress>;
export type BadgeView = { badge: Badge; awardedAt: string };
export type ProgressView = LevelProgress & { streak: number; badges: BadgeView[] };
export type EarnResult = LevelProgress & { xpAwarded: number; badgesAwarded: Badge[] };

export function badgeViews(rows: { badge: Badge; awardedAt: Date }[]): BadgeView[] {
  return rows.map(({ badge, awardedAt }) => ({ badge, awardedAt: awardedAt.toISOString() }));
}
