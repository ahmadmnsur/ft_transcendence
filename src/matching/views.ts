import type { ReviewDetail } from '../reviews/views';
import type { MatchRole, MatchStatus, Mission } from '../shared/matches';
import type { StudentRef } from '../students/student-ref';
import type { SkillView } from '../students/views';

// §6.6 and §6.13's wire shapes, exact field names: the SPA depends on them.
// Every time is an ISO 8601 string.

// The frozen explanation (§4.3.11): FORWARD is what the Mentee gains, REVERSE
// what the Mentor gains, each sorted by Skill name.
export type CoverageView = { forward: SkillView[]; reverse: SkillView[] };

// §6.6: one Match from one participant's side. `handMade` is true exactly when
// `compatibilityScore` is null (§4.3.10).
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

// §6.13: one Match with both participants named, for an Admin.
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

// §6.6's `GET /api/rounds/current`.
export type CurrentRound = { round: { id: string; number: number; openedAt: string } | null };

// §6.6's `GET /api/matches/current`: the actor's standing Match in the open
// Round, or null.
export type CurrentMatch = { match: MatchView | null };

// §6.0.1's table page: one page of the actor's Matches and the count of all.
export type MatchHistoryPage = { items: MatchView[]; total: number };

// §8.4's result. `unmatched` are the candidates the matcher left out.
export type OpenRoundResult = {
  round: { id: string; number: number };
  matchCount: number;
  unmatched: StudentRef[];
};

// §8.7's result: only changed Streaks and newly inserted Badges are counted.
export type CloseRoundResult = {
  roundId: string;
  lapsed: number;
  streaksIncremented: number;
  streaksReset: number;
  consistentLearnerAwarded: number;
};

// How many of a Round's Matches are in each status, every status present.
export type StatusCounts = Record<MatchStatus, number>;

// One row of §6.13's `GET /api/admin/rounds`.
export type AdminRoundSummary = {
  id: string;
  number: number;
  openedAt: string;
  closedAt: string | null;
  counts: StatusCounts;
};

// One Match on §6.13's `GET /api/admin/rounds/:id`: the pair, the status, the
// Score or hand-made, and the Mission.
export type AdminRoundMatch = {
  id: string;
  mentor: StudentRef;
  mentee: StudentRef;
  status: MatchStatus;
  compatibilityScore: number | null;
  handMade: boolean;
  mission: Mission;
};

// One Match on §6.12's `GET /api/admin/students/:id`: a Round's row with the
// Round's number, since the list spans every Round the Student was in.
export type AdminStudentMatch = AdminRoundMatch & { roundNumber: number };

// §6.13's `GET /api/admin/rounds/:id`. `unmatched` (§8.9) is derived for the
// open Round only, and null for a closed one.
export type AdminRoundDetail = {
  round: { id: string; number: number; openedAt: string; closedAt: string | null };
  matches: AdminRoundMatch[];
  unmatched: StudentRef[] | null;
};
