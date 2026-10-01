import type { Candidate, ScoredOrientation } from './types';

// §8.2. Integer arithmetic only: with at most 27 catalogue Skills N < 2^53,
// so every intermediate value is exact and the division by 2·D (a power of
// two) is exact too. base is round half up on the exact weighted sum N/D.
export function compatibilityScore(
  forwardCount: number,
  reverseCount: number,
  goalBonus: boolean,
): number {
  const m = Math.max(forwardCount, reverseCount);
  const d = 2 ** m;
  const n = 70 * (d - 2 ** (m - forwardCount)) + 30 * (d - 2 ** (m - reverseCount));
  const base = Math.floor((2 * n + d) / (2 * d));
  return Math.min(100, base + (goalBonus ? 10 : 0));
}

// Plain string comparison, never localeCompare: the order must not depend on the locale.
function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

// Intersection, de-duplicated and sorted ascending so the output does not
// depend on the input array order.
function intersectSorted(a: readonly string[], b: readonly string[]): string[] {
  const inB = new Set(b);
  const out = new Set<string>();
  for (const skill of a) {
    if (inB.has(skill)) out.add(skill);
  }
  return [...out].sort(compareStrings);
}

// §8.2: forward is what the Mentee gains, reverse what the Mentor gains.
// Only the Mentee's Learning Goal can earn the bonus.
export function scoreOrientation(mentor: Candidate, mentee: Candidate): ScoredOrientation {
  const forward = intersectSorted(mentor.teach, mentee.learn);
  const reverse = intersectSorted(mentee.teach, mentor.learn);
  const goalBonusApplied =
    mentee.goalSkillId !== null && forward.includes(mentee.goalSkillId);
  return {
    mentorId: mentor.id,
    menteeId: mentee.id,
    score: compatibilityScore(forward.length, reverse.length, goalBonusApplied),
    goalBonusApplied,
    forward,
    reverse,
  };
}

// §8.3 steps 3-4. Also orients an Admin's hand-made Match (§8.6).
export function orientPair(a: Candidate, b: Candidate): ScoredOrientation {
  const ab = scoreOrientation(a, b);
  const ba = scoreOrientation(b, a);
  if (ba.score !== ab.score) return ba.score > ab.score ? ba : ab;
  return a.id < b.id ? ab : ba;
}
