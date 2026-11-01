export type Candidate = {
  id: string;
  teach: readonly string[];
  learn: readonly string[];
  goalSkillId: string | null;
  level: number;
};

export type UnorderedPair = readonly [string, string];

export type MatcherInput = {
  candidates: readonly Candidate[];
  history: readonly UnorderedPair[];
  blocked: readonly UnorderedPair[];
};

export type ScoredOrientation = {
  mentorId: string;
  menteeId: string;
  score: number;
  goalBonusApplied: boolean;
  forward: string[];
  reverse: string[];
};

export type MatcherMatch = ScoredOrientation & { index: number };
