import { describe, expect, it } from 'vitest';
import { generateCohort, levelOf, type CohortStudent } from '../../prisma/fixtures/cohort';
import {
  runMatcher,
  type Candidate,
  type MatcherInput,
  type MatcherMatch,
  type UnorderedPair,
} from '../../src/matching/engine';

function candidate(
  id: string,
  teach: string[],
  learn: string[],
  level = 1,
  goalSkillId: string | null = null,
): Candidate {
  return { id, teach, learn, goalSkillId, level };
}

function toCandidate(s: CohortStudent): Candidate {
  return {
    id: s.id,
    teach: s.canTeach,
    learn: s.wantsToLearn,
    goalSkillId: s.learningGoal ?? null,
    level: levelOf(s.xp),
  };
}

function cohort(): Candidate[] {
  return generateCohort({ size: 20, seed: 42 }).map(toCandidate);
}

function pairKey(a: string, b: string): string {
  return JSON.stringify(a < b ? [a, b] : [b, a]);
}

describe('most-constrained-first', () => {
  it('strands nobody on the prototype starvation cohort', () => {
    const input: MatcherInput = {
      candidates: [
        candidate('s0', ['Docker', 'Git', 'SQL', 'React'], ['Graphics', 'Threads'], levelOf(1200)),
        candidate('s1', ['Graphics', 'Threads'], ['Docker', 'Git', 'SQL', 'React'], levelOf(1300)),
        candidate('s2', ['Shell'], ['Docker', 'Git'], levelOf(400)),
        candidate('s3', ['Shell'], ['Graphics'], levelOf(500)),
      ],
      history: [],
      blocked: [],
    };
    expect(runMatcher(input)).toEqual([
      {
        mentorId: 's0',
        menteeId: 's2',
        score: 53,
        goalBonusApplied: false,
        forward: ['Docker', 'Git'],
        reverse: [],
        index: 0,
      },
      {
        mentorId: 's1',
        menteeId: 's3',
        score: 35,
        goalBonusApplied: false,
        forward: ['Graphics'],
        reverse: [],
        index: 1,
      },
    ]);
  });

  it('recounts viable partners after every Match', () => {
    const input: MatcherInput = {
      candidates: [
        candidate('e', ['ed'], ['ce1', 'ce2', 'de1', 'de2']),
        candidate('d', ['de1', 'de2'], ['cd', 'ed']),
        candidate('c', ['cd', 'ce1', 'ce2'], ['bc']),
        candidate('b', ['bc'], ['ab']),
        candidate('a', ['ab'], ['none']),
      ],
      history: [],
      blocked: [],
    };
    expect(runMatcher(input)).toEqual([
      {
        mentorId: 'a',
        menteeId: 'b',
        score: 35,
        goalBonusApplied: false,
        forward: ['ab'],
        reverse: [],
        index: 0,
      },
      {
        mentorId: 'c',
        menteeId: 'e',
        score: 53,
        goalBonusApplied: false,
        forward: ['ce1', 'ce2'],
        reverse: [],
        index: 1,
      },
    ]);
  });

  it('applies the Level-gap penalty, and breaks an equal priority on Score', () => {
    const input = (cLevel: number): MatcherInput => ({
      candidates: [
        candidate('c', ['R1', 'R2', 'Q1'], ['K1', 'K2', 'K3', 'K4'], cLevel),
        candidate('b', ['R1', 'R2'], ['K1', 'K2', 'K3', 'Q1'], 1),
        candidate('a', ['K1', 'K2', 'K3', 'K4'], ['R1', 'R2'], 1),
      ],
      history: [],
      blocked: [],
    });
    const aMentorsB: MatcherMatch = {
      mentorId: 'a',
      menteeId: 'b',
      score: 84,
      goalBonusApplied: false,
      forward: ['K1', 'K2', 'K3'],
      reverse: ['R1', 'R2'],
      index: 0,
    };
    const aMentorsC: MatcherMatch = {
      mentorId: 'a',
      menteeId: 'c',
      score: 88,
      goalBonusApplied: false,
      forward: ['K1', 'K2', 'K3', 'K4'],
      reverse: ['R1', 'R2'],
      index: 0,
    };
    expect(runMatcher(input(4))).toEqual([aMentorsC]);
    expect(runMatcher(input(5))).toEqual([aMentorsC]);
    expect(runMatcher(input(6))).toEqual([aMentorsB]);
  });

  it('breaks a priority and Score tie on the smaller pair key', () => {
    const input: MatcherInput = {
      candidates: [
        candidate('z', ['Z8'], ['T1', 'T2']),
        candidate('y', ['T2'], ['T1']),
        candidate('x', ['T1'], ['W1']),
      ],
      history: [],
      blocked: [],
    };
    expect(runMatcher(input)).toEqual([
      {
        mentorId: 'x',
        menteeId: 'y',
        score: 35,
        goalBonusApplied: false,
        forward: ['T1'],
        reverse: [],
        index: 0,
      },
    ]);

    const lowerIdsDiffer: MatcherInput = {
      candidates: [
        candidate('z', ['zp', 'zq'], ['mz']),
        candidate('q', [], ['aq', 'zq']),
        candidate('p', [], ['ap', 'zp']),
        candidate('m', ['mz'], ['am']),
        candidate('a', ['am', 'ap', 'aq'], []),
      ],
      history: [],
      blocked: [],
    };
    expect(runMatcher(lowerIdsDiffer)).toEqual([
      {
        mentorId: 'a',
        menteeId: 'm',
        score: 35,
        goalBonusApplied: false,
        forward: ['am'],
        reverse: [],
        index: 0,
      },
      {
        mentorId: 'z',
        menteeId: 'p',
        score: 35,
        goalBonusApplied: false,
        forward: ['zp'],
        reverse: [],
        index: 1,
      },
    ]);
  });
});

describe('six rounds over generateCohort({ size: 20, seed: 42 })', () => {
  function sixRounds() {
    const candidates = cohort();
    const history: UnorderedPair[] = [];
    const rounds = [];
    for (let k = 0; k < 6; k++) {
      const matches = runMatcher({ candidates, history, blocked: [] });
      rounds.push(matches);
      for (const m of matches) history.push([m.mentorId, m.menteeId]);
    }
    return { candidates, rounds };
  }

  it('matches with forward cover and score >= 25, never vacuously', () => {
    const { rounds } = sixRounds();
    const seen = new Set<string>();
    for (const matches of rounds) {
      expect(matches.length).toBeGreaterThan(0);
      const inRound = new Set<string>();
      matches.forEach((m, i) => {
        expect(m.index).toBe(i);
        expect(m.menteeId).not.toBe(m.mentorId);
        expect(m.forward.length).toBeGreaterThan(0);
        expect(m.score).toBeGreaterThanOrEqual(25);
        expect(inRound.has(m.mentorId)).toBe(false);
        expect(inRound.has(m.menteeId)).toBe(false);
        inRound.add(m.mentorId);
        inRound.add(m.menteeId);
        const key = pairKey(m.mentorId, m.menteeId);
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      });
    }
  });

  it('is deterministic (C6) and independent of input order', () => {
    const first = sixRounds();
    expect(sixRounds().rounds).toEqual(first.rounds);

    const roundIndex = 2;
    const history: UnorderedPair[] = [];
    for (let k = 0; k < roundIndex; k++) {
      for (const m of first.rounds[k]) history.push([m.mentorId, m.menteeId]);
    }
    const blocked: UnorderedPair[] = first.rounds[roundIndex]
      .slice(0, 2)
      .map((m): UnorderedPair => [m.mentorId, m.menteeId]);
    const candidates = cohort();
    const base = runMatcher({ candidates, history, blocked });
    expect(base).not.toEqual(first.rounds[roundIndex]);
    const baseKeys = new Set(
      base.map((m) => pairKey(m.mentorId, m.menteeId)),
    );
    for (const [x, y] of blocked) {
      expect(baseKeys.has(pairKey(x, y))).toBe(false);
    }
    const reordered = runMatcher({
      candidates: candidates.slice().reverse(),
      history: history.slice().reverse(),
      blocked: blocked.slice().reverse(),
    });
    expect(reordered).toEqual(base);
    const swapped = runMatcher({
      candidates,
      history: history.map(([x, y]): UnorderedPair => [y, x]),
      blocked: blocked.map(([x, y]): UnorderedPair => [y, x]),
    });
    expect(swapped).toEqual(base);
  });

  it('excludes history and blocked pairs, in either tuple order', () => {
    const candidates = cohort();
    const baseline = runMatcher({ candidates, history: [], blocked: [] });
    expect(baseline.length).toBeGreaterThanOrEqual(2);
    const [dropped1, dropped2] = baseline;
    const rerun = runMatcher({
      candidates,
      history: [[dropped1.mentorId, dropped1.menteeId]],
      blocked: [[dropped2.menteeId, dropped2.mentorId]],
    });
    const keys = new Set(
      rerun.map((m) => pairKey(m.mentorId, m.menteeId)),
    );
    expect(keys.has(pairKey(dropped1.mentorId, dropped1.menteeId))).toBe(false);
    expect(keys.has(pairKey(dropped2.mentorId, dropped2.menteeId))).toBe(false);
  });
});
