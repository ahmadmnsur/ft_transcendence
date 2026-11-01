const XP_PER_LEVEL = 250;
const MAX_LEVEL = 10;

export function levelFor(xp: number): number {
  return Math.min(MAX_LEVEL, 1 + Math.floor(xp / XP_PER_LEVEL));
}

export function levelProgress(xp: number) {
  const level = levelFor(xp);
  return {
    xp,
    level,
    xpIntoLevel: xp - XP_PER_LEVEL * (level - 1),
    xpForNextLevel: level === MAX_LEVEL ? null : XP_PER_LEVEL,
  };
}
