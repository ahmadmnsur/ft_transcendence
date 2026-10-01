import { describe, expect, it } from 'vitest';
import {
  compatibilityScore,
  orientPair,
  scoreOrientation,
  type Candidate,
} from '../../src/matching/engine';

function candidate(
  id: string,
  teach: string[],
  learn: string[],
  goalSkillId: string | null = null,
): Candidate {
  return { id, teach, learn, goalSkillId, level: 1 };
}

// §8.2: M = max(f, r); D = 2^M; N = 70·(D − 2^(M−f)) + 30·(D − 2^(M−r));
// base = floor((2·N + D) / (2·D)); score = min(100, base + bonus).
describe('compatibilityScore', () => {
  it('rounds the five exact halves up', () => {
    // The exact weighted sums N/D are 22.5, 52.5, 57.5, 67.5, 87.5;
    // base = floor((2·N + D) / (2·D)) is round half up on the exact value.
    // A float 0.7·cover(…) evaluation rounds 22.5, 52.5 and 57.5 down.
    expect(compatibilityScore(0, 2, false)).toBe(23); // exact 22.5
    expect(compatibilityScore(2, 0, false)).toBe(53); // exact 52.5
    expect(compatibilityScore(1, 2, false)).toBe(58); // exact 57.5
    expect(compatibilityScore(2, 1, false)).toBe(68); // exact 67.5
    expect(compatibilityScore(3, 3, false)).toBe(88); // exact 87.5
  });

  it('matches the reference values and caps the bonus at 100', () => {
    expect(compatibilityScore(0, 0, false)).toBe(0);
    expect(compatibilityScore(1, 0, false)).toBe(35);
    expect(compatibilityScore(2, 0, false)).toBe(53);
    expect(compatibilityScore(1, 1, false)).toBe(50);
    expect(compatibilityScore(1, 1, true)).toBe(60);
    expect(compatibilityScore(5, 5, false)).toBe(97);
    expect(compatibilityScore(5, 5, true)).toBe(100);
  });
});

describe('scoreOrientation', () => {
  it('covers the set arithmetic and the halves through constructed candidates', () => {
    // (f,r) = (2,0): exact weighted sum 52.5, rounded half up to 53.
    const mentor = candidate('m', ['A', 'B'], ['W']);
    const mentee = candidate('e', ['Z'], ['A', 'B', 'X']);
    const o = scoreOrientation(mentor, mentee);
    expect(o).toEqual({
      mentorId: 'm',
      menteeId: 'e',
      score: 53,
      goalBonusApplied: false,
      forward: ['A', 'B'],
      reverse: [],
    });

    // (f,r) = (1,2): exact 57.5 → 58.
    const o2 = scoreOrientation(
      candidate('m', ['A'], ['P', 'Q']),
      candidate('e', ['P', 'Q'], ['A', 'X']),
    );
    expect(o2.score).toBe(58);
    expect(o2.forward).toEqual(['A']);
    expect(o2.reverse).toEqual(['P', 'Q']);
  });

  it('applies the bonus from the mentee goal only, never the mentor goal', () => {
    const base = candidate('m', ['A'], ['Z'], null);
    // Mentee goal inside forward → bonus.
    const withGoal = scoreOrientation(base, candidate('e', ['Q'], ['A'], 'A'));
    expect(withGoal.score).toBe(45); // (1,0) → 35 + 10
    expect(withGoal.goalBonusApplied).toBe(true);
    // Mentee goal outside forward → no bonus.
    const missed = scoreOrientation(base, candidate('e', ['Q'], ['A'], 'X'));
    expect(missed.score).toBe(35);
    expect(missed.goalBonusApplied).toBe(false);
    // Mentor goal inside reverse → still no bonus.
    const mentorGoal = scoreOrientation(
      candidate('m', ['A'], ['Z'], 'Z'),
      candidate('e', ['Z'], ['A'], null),
    );
    expect(mentorGoal.score).toBe(50); // (1,1), no bonus
    expect(mentorGoal.goalBonusApplied).toBe(false);
  });
});

describe('orientPair', () => {
  it('keeps the higher score and breaks a tie on the lower id', () => {
    // ADR-0006 rounding note: A teaches B one Skill which is B's Learning
    // Goal (58 + 10 = 68), B teaches A two Skills, neither A's goal
    // ((2,1) = 67.5 → 68). Both orientations score 68.
    const a = candidate('a', ['S1'], ['T1', 'T2'], null);
    const b = candidate('b', ['T1', 'T2'], ['S1'], 'S1');
    const ab = orientPair(a, b);
    expect(ab.mentorId).toBe('a');
    expect(ab.score).toBe(68);
    // Same pair with the lower id on the other side.
    const c = candidate('c', ['T1', 'T2'], ['S1'], 'S1');
    const d = candidate('d', ['S1'], ['T1', 'T2'], null);
    const cd = orientPair(c, d);
    expect(cd.mentorId).toBe('c');
    expect(cd.score).toBe(68);
    // Argument order never matters: the tie case with swapped arguments.
    expect(orientPair(b, a).mentorId).toBe('a');
    // ADR-0006 decision 5: the higher-scoring side has the HIGHER id. x as
    // Mentor is (1,1) = 50 with no bonus (y has no goal); y as Mentor is
    // (1,1) + 10 = 60 (x's goal Q is in forward). y mentors either way.
    const x = candidate('x', ['P'], ['Q'], 'Q');
    const y = candidate('y', ['Q'], ['P'], null);
    const expected = {
      mentorId: 'y',
      menteeId: 'x',
      score: 60,
      goalBonusApplied: true,
      forward: ['Q'],
      reverse: ['P'],
    };
    expect(orientPair(x, y)).toEqual(expected);
    expect(orientPair(y, x)).toEqual(expected);
  });
});
