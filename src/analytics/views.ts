import type { SkillView } from '../students/views';

export type SkillDemand = { skill: SkillView; demand: number };
export type SkillSupply = { skill: SkillView; supply: number };
export type SkillInsight = SkillDemand & SkillSupply;
export type SkillGap = SkillInsight & { gap: number };
export type Completion = { completed: number; total: number; rate: number | null };

export type AnalyticsView = {
  skills: { mostRequested: SkillDemand[]; mostAvailable: SkillSupply[]; gap: SkillGap[] };
  insights: { gap: SkillInsight[]; uncovered: SkillInsight[] };
  completion: {
    overall: Completion;
    perRound: (Completion & { roundNumber: number })[];
  };
  outcomes: {
    closed: { COMPLETED: number; LAPSED: number; DECLINED: number; TERMINATED_BY_ADMIN: number };
    open: { roundNumber: number; MATCHED: number; ACCEPTED: number } | null;
  };
};
