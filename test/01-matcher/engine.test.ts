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
    // Literals from the `starvation` entry of COHORTS in
    // compatibility-score-PROTOTYPE.html (goal defaults to null there).
    // Levels via levelOf(xp): s0 → 5, s1 → 6, s2 → 2, s3 → 3.
    // (s0,s1): (4,2) → 88, reverse (2,4) → 81,
    //   so s0 mentors. (s0,s2): (2,0) → 53, reverse (0,2) → 23, s0 mentors.
    // (s1,s3): (1,0) → 35, reverse (0,1) → 15, s1 mentors. Every other pair
    // scores 0 and is discarded. Viable counts: s0:2, s1:2, s2:1, s3:1, so
    // s2 picks first and takes its only pair; then s1–s3. Greedy would take
    // s0–s1 (88) and strand s2 and s3.
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
    // (a,b): a mentors (1,0) = 35, reverse (0,1) = 15.
    // (b,c): b mentors (1,0) = 35, reverse (0,1) = 15.
    // (c,d): c mentors (1,0) = 35, reverse (0,1) = 15.
    // (c,e): c mentors (2,0) = 53, reverse (0,2) = 23.
    // (d,e): d mentors (2,1) = 68, reverse (1,2) = 58.
    // Every other pair scores 0. Equal Levels, so priority = Score.
    // Initial counts a:1, b:2, c:3, d:2, e:2 → a takes (a,b). Recounted,
    // c:2, d:2, e:2 → tie, lower id c takes its best, (c,e) at 53. Counting
    // once up front would keep c at 3, so d would pick and take (d,e) at 68.
    // Reverse id order: input order must not stand in for the id tie-breaks.
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
    // (a,b): f = 3 ({K1..K3}), r = 2 ({R1,R2}) → 84; reverse (2,3) → 79,
    // so a mentors. Gap 0 → priority 84.
    // (a,c): f = 4 ({K1..K4}), r = 2 ({R1,R2}) → 88; reverse (2,4) → 81,
    // so a mentors. a is Level 1, so priority 88 − 2·max(0, (c's Level − 1) − 2).
    // (b,c): c mentors, (1,0) → 35. All three have two viable partners, so
    // the lower id a chooses between (a,b) and (a,c):
    // - c at Level 4, gap 3: 86 > 84, (a,c). Without the 2-Level allowance,
    //   88 − 2·3 = 82 would hand it to (a,b).
    // - c at Level 5, gap 4: 84 = 84, the greater Score takes it: (a,c).
    //   Without the Score step, the smaller pair key would take (a,b).
    // - c at Level 6, gap 5: 82 < 84, (a,b), although (a,c) scores higher.
    //   At 1 per Level, 88 − 3 = 85 would hand it to (a,c).
    // Reverse id order: input order must not stand in for the id tie-breaks.
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
    // Every pair scores 35 with priority 35 and no level gap: (x,y) and
    // (x,z) are x mentors (1,0), reverses are (0,1) → 15; (y,z) is y
    // mentors (1,0), reverse (0,1) → 15. All counts are 2, so the lower id
    // x chooses between equal pairs; ('x','y') < ('x','z') wins.
    // Reverse id order: input order must not stand in for the id tie-breaks.
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

    // The lower ids differ. Each edge is one Skill taught one way, so it
    // scores (1,0) → 35 with its reverse (0,1) → 15, at equal Levels:
    // a→m, a→p, a→q, m→z, z→p, z→q. Every other pair scores 0.
    // Counts a:3, m:2, p:2, q:2, z:3, so m chooses between (a,m) and (m,z),
    // equal on priority and Score: ('a','m') < ('m','z'), so a mentors m.
    // Recounted, p:1, q:1, z:2: p takes its only pair, z mentors p, and q
    // is left unmatched.
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
      // Non-vacuous: every Round emits at least one Match.
      expect(matches.length).toBeGreaterThan(0);
      const inRound = new Set<string>();
      matches.forEach((m, i) => {
        expect(m.index).toBe(i);
        expect(m.menteeId).not.toBe(m.mentorId);
        // C3: at least one FORWARD Skill. C7: none below 25.
        expect(m.forward.length).toBeGreaterThan(0);
        expect(m.score).toBeGreaterThanOrEqual(25);
        // One Match per Student per Round.
        expect(inRound.has(m.mentorId)).toBe(false);
        expect(inRound.has(m.menteeId)).toBe(false);
        inRound.add(m.mentorId);
        inRound.add(m.menteeId);
        // No pair repeats across the six Rounds.
        const key = pairKey(m.mentorId, m.menteeId);
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      });
    }
  });

  it('is deterministic (C6) and independent of input order', () => {
    const first = sixRounds();
    // Same input again from scratch → deep-equal output.
    expect(sixRounds().rounds).toEqual(first.rounds);

    // Same Round with its first two Matches blocked → deep-equal output
    // under either shuffle. Fixed permutations, no randomness. The blocked
    // pairs come from this Round's own unblocked output, so blocking must
    // change the Round.
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
    // Non-vacuous: the blocked Round differs and both blocked pairs are gone.
    expect(base).not.toEqual(first.rounds[roundIndex]);
    const baseKeys = new Set(
      base.map((m) => pairKey(m.mentorId, m.menteeId)),
    );
    for (const [x, y] of blocked) {
      expect(baseKeys.has(pairKey(x, y))).toBe(false);
    }
    // `reordered` reverses each input array, tuples kept as given; `swapped`
    // keeps array order and swaps every tuple. Separate because changing both
    // at once cancels out for an engine that reads a tuple in candidate order.
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
      // Reversed tuple: exclusion holds in either order.
      blocked: [[dropped2.menteeId, dropped2.mentorId]],
    });
    const keys = new Set(
      rerun.map((m) => pairKey(m.mentorId, m.menteeId)),
    );
    expect(keys.has(pairKey(dropped1.mentorId, dropped1.menteeId))).toBe(false);
    expect(keys.has(pairKey(dropped2.mentorId, dropped2.menteeId))).toBe(false);
  });
});
