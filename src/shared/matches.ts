export const MATCH_STATUSES = [
  'MATCHED',
  'ACCEPTED',
  'COMPLETED',
  'LAPSED',
  'DECLINED',
  'TERMINATED_BY_ADMIN',
] as const;

export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const STANDING_STATUSES = ['MATCHED', 'ACCEPTED', 'COMPLETED', 'LAPSED'] as const satisfies readonly MatchStatus[];
export const IN_PROGRESS_STATUSES = ['MATCHED', 'ACCEPTED'] as const satisfies readonly MatchStatus[];

export type InProgressStatus = (typeof IN_PROGRESS_STATUSES)[number];

export function isInProgress(status: MatchStatus): status is InProgressStatus {
  return (IN_PROGRESS_STATUSES as readonly MatchStatus[]).includes(status);
}

export const MISSIONS = [
  'TECHNICAL_CONCEPT',
  'PROJECT_PROBLEM',
  'PAIR_PROGRAMMING',
  'CODE_REVIEW',
  'TECHNOLOGY_DISCUSSION',
  'ADVICE',
] as const;

export type Mission = (typeof MISSIONS)[number];

export type MatchRole = 'MENTOR' | 'MENTEE';
