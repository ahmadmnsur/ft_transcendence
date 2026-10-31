import type { ReviewDetail } from '../reviews/views';
import type { MatchRole, MatchStatus, Mission } from '../shared/matches';
import type { StudentRef } from '../students/student-ref';
import type { SkillView } from '../students/views';


export type CoverageView = { forward: SkillView[]; reverse: SkillView[] };

export type MatchView = {
  id: string;
  roundNumber: number;
  status: MatchStatus;
  myRole: MatchRole;
  partner: StudentRef;
  compatibilityScore: number | null;
  handMade: boolean;
  goalBonusApplied: boolean;
  coverage: CoverageView;
  mission: Mission;
  iAccepted: boolean;
  partnerAccepted: boolean;
};

export type MatchDetailView = MatchView & ReviewDetail;
export type AdminMatchDetailView = AdminMatchView & ReviewDetail;

export type AdminMatchView = {
  id: string;
  roundNumber: number;
  status: MatchStatus;
  mentor: StudentRef;
  mentee: StudentRef;
  compatibilityScore: number | null;
  handMade: boolean;
  goalBonusApplied: boolean;
  coverage: CoverageView;
  mission: Mission;
  mentorAccepted: boolean;
  menteeAccepted: boolean;
  declinedBy: StudentRef | null;
};

export type CurrentRound = { round: { id: string; number: number; openedAt: string } | null };

export type CurrentMatch = { match: MatchView | null };

export type MatchHistoryPage = { items: MatchView[]; total: number };

export type OpenRoundResult = {
  round: { id: string; number: number };
  matchCount: number;
  unmatched: StudentRef[];
};

export type CloseRoundResult = {
  roundId: string;
  lapsed: number;
  streaksIncremented: number;
  streaksReset: number;
  consistentLearnerAwarded: number;
};

export type StatusCounts = Record<MatchStatus, number>;

export type AdminRoundSummary = {
  id: string;
  number: number;
  openedAt: string;
  closedAt: string | null;
  counts: StatusCounts;
};

export type AdminRoundMatch = {
  id: string;
  mentor: StudentRef;
  mentee: StudentRef;
  status: MatchStatus;
  compatibilityScore: number | null;
  handMade: boolean;
  mission: Mission;
};

export type AdminStudentMatch = AdminRoundMatch & { roundNumber: number };

export type AdminRoundDetail = {
  round: { id: string; number: number; openedAt: string; closedAt: string | null };
  matches: AdminRoundMatch[];
  unmatched: StudentRef[] | null;
};
