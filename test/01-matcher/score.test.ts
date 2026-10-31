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

describe('compatibilityScore', () => {
  it('rounds the five exact halves up', () => {
    expect(compatibilityScore(0, 2, false)).toBe(23);
    expect(compatibilityScore(2, 0, false)).toBe(53);
    expect(compatibilityScore(1, 2, false)).toBe(58);
    expect(compatibilityScore(2, 1, false)).toBe(68);
    expect(compatibilityScore(3, 3, false)).toBe(88);
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
    const withGoal = scoreOrientation(base, candidate('e', ['Q'], ['A'], 'A'));
    expect(withGoal.score).toBe(45);
    expect(withGoal.goalBonusApplied).toBe(true);
    const missed = scoreOrientation(base, candidate('e', ['Q'], ['A'], 'X'));
    expect(missed.score).toBe(35);
    expect(missed.goalBonusApplied).toBe(false);
    const mentorGoal = scoreOrientation(
      candidate('m', ['A'], ['Z'], 'Z'),
      candidate('e', ['Z'], ['A'], null),
    );
    expect(mentorGoal.score).toBe(50);
    expect(mentorGoal.goalBonusApplied).toBe(false);
  });
});

describe('orientPair', () => {
  it('keeps the higher score and breaks a tie on the lower id', () => {
    const a = candidate('a', ['S1'], ['T1', 'T2'], null);
    const b = candidate('b', ['T1', 'T2'], ['S1'], 'S1');
    const ab = orientPair(a, b);
    expect(ab.mentorId).toBe('a');
    expect(ab.score).toBe(68);
    const c = candidate('c', ['T1', 'T2'], ['S1'], 'S1');
    const d = candidate('d', ['S1'], ['T1', 'T2'], null);
    const cd = orientPair(c, d);
    expect(cd.mentorId).toBe('c');
    expect(cd.score).toBe(68);
    expect(orientPair(b, a).mentorId).toBe('a');
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
