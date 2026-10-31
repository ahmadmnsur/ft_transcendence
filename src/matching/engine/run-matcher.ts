import { orientPair } from './score';
import type { MatcherInput, MatcherMatch, ScoredOrientation } from './types';

type ViablePair = {
  lowId: string;
  highId: string;
  orientation: ScoredOrientation;
  priority: number;
};

export function runMatcher(input: MatcherInput): MatcherMatch[] {
  const excluded = new Map<string, Set<string>>();
  const exclude = (x: string, y: string): void => {
    let partners = excluded.get(x);
    if (partners === undefined) {
      partners = new Set();
      excluded.set(x, partners);
    }
    partners.add(y);
  };
  for (const [x, y] of [...input.history, ...input.blocked]) {
    exclude(x, y);
    exclude(y, x);
  }

  const pairs: ViablePair[] = [];
  const candidates = input.candidates;
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      if (excluded.get(a.id)?.has(b.id) === true) continue;
      const orientation = orientPair(a, b);
      if (orientation.score < 25) continue;
      const gap = Math.abs(a.level - b.level);
      pairs.push({
        lowId: a.id < b.id ? a.id : b.id,
        highId: a.id < b.id ? b.id : a.id,
        orientation,
        priority: orientation.score - 2 * Math.max(0, gap - 2),
      });
    }
  }

  const matched = new Set<string>();
  const matches: MatcherMatch[] = [];
  for (;;) {
    const viableBy = new Map<string, ViablePair[]>();
    for (const pair of pairs) {
      if (matched.has(pair.lowId) || matched.has(pair.highId)) continue;
      pushViable(viableBy, pair.lowId, pair);
      pushViable(viableBy, pair.highId, pair);
    }
    let chosen: string | null = null;
    let fewest = 0;
    for (const [id, viable] of viableBy) {
      if (chosen === null || viable.length < fewest || (viable.length === fewest && id < chosen)) {
        chosen = id;
        fewest = viable.length;
      }
    }
    if (chosen === null) break;
    const viable = viableBy.get(chosen) as ViablePair[];
    viable.sort(comparePairs);
    const won = viable[0];
    matches.push({ ...won.orientation, index: matches.length });
    matched.add(won.lowId);
    matched.add(won.highId);
  }

  return matches;
}

function pushViable(
  viableBy: Map<string, ViablePair[]>,
  id: string,
  pair: ViablePair,
): void {
  let viable = viableBy.get(id);
  if (viable === undefined) {
    viable = [];
    viableBy.set(id, viable);
  }
  viable.push(pair);
}

function comparePairs(a: ViablePair, b: ViablePair): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  if (a.orientation.score !== b.orientation.score) return b.orientation.score - a.orientation.score;
  if (a.lowId !== b.lowId) return a.lowId < b.lowId ? -1 : 1;
  if (a.highId !== b.highId) return a.highId < b.highId ? -1 : 1;
  return 0;
}
