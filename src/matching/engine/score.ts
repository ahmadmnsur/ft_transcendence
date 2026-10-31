import type { Candidate, ScoredOrientation } from './types';

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

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function intersectSorted(a: readonly string[], b: readonly string[]): string[] {
  const inB = new Set(b);
  const out = new Set<string>();
  for (const skill of a) {
    if (inB.has(skill)) out.add(skill);
  }
  return [...out].sort(compareStrings);
}

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

export function orientPair(a: Candidate, b: Candidate): ScoredOrientation {
  const ab = scoreOrientation(a, b);
  const ba = scoreOrientation(b, a);
  if (ba.score !== ab.score) return ba.score > ab.score ? ba : ab;
  return a.id < b.id ? ab : ba;
}
