// §10.2: Level is derived on read, never stored. Band n (1–9) spans
// [250·(n−1), 250·n); Level 10 starts at 2250 and is terminal. §3.4 puts
// Level arithmetic in `gamification`.
const XP_PER_LEVEL = 250;
const MAX_LEVEL = 10;

export function levelFor(xp: number): number {
  return Math.min(MAX_LEVEL, 1 + Math.floor(xp / XP_PER_LEVEL));
}
