export type {
  Candidate,
  MatcherInput,
  MatcherMatch,
  ScoredOrientation,
  UnorderedPair,
} from './types';
export { compatibilityScore, orientPair, scoreOrientation } from './score';
export { runMatcher } from './run-matcher';
