// §4.2: the Match enum mirrors both ends share, in declaration order. Plain
// TypeScript only, so this file compiles under both tsconfigs.

export const MATCH_STATUSES = [
  'MATCHED',
  'ACCEPTED',
  'COMPLETED',
  'LAPSED',
  'DECLINED',
  'TERMINATED_BY_ADMIN',
] as const;

export type MatchStatus = (typeof MATCH_STATUSES)[number];

// §8.8: a standing Match counts toward "matched" in its Round; a repudiated
// one does not. In progress is what accept, decline and close act on.
export const STANDING_STATUSES = ['MATCHED', 'ACCEPTED', 'COMPLETED', 'LAPSED'] as const satisfies readonly MatchStatus[];
export const IN_PROGRESS_STATUSES = ['MATCHED', 'ACCEPTED'] as const satisfies readonly MatchStatus[];

export type InProgressStatus = (typeof IN_PROGRESS_STATUSES)[number];

export function isInProgress(status: MatchStatus): status is InProgressStatus {
  return (IN_PROGRESS_STATUSES as readonly MatchStatus[]).includes(status);
}

// §8.10: the round-robin order. Index i takes MISSIONS[i mod 6].
export const MISSIONS = [
  'TECHNICAL_CONCEPT',
  'PROJECT_PROBLEM',
  'PAIR_PROGRAMMING',
  'CODE_REVIEW',
  'TECHNOLOGY_DISCUSSION',
  'ADVICE',
] as const;

export type Mission = (typeof MISSIONS)[number];

// §6.6: which side of a Match the reader is on.
export type MatchRole = 'MENTOR' | 'MENTEE';
