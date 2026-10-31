import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../core/uow';
import { CANDIDATE_WHERE } from '../matching/candidates';
import type { MatchStatus } from '../shared/matches';
import type { AnalyticsView, Completion, SkillGap, SkillInsight } from './views';

function completion(completed: number, total: number): Completion {
  return { completed, total, rate: total === 0 ? null : completed / total * 100 };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly uow: UnitOfWork) {}

  snapshot(): Promise<AnalyticsView> {
    return this.uow.readOnly(async (tx) => {
      const counts = await tx.studentSkill.groupBy({
        by: ['skillId', 'kind'],
        where: { student: CANDIDATE_WHERE },
        _count: { _all: true },
      });
      const catalogue = await tx.skill.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, _count: { select: { matchCoverage: true } } },
      });
      const bySkill = new Map(catalogue.map(({ id, name, _count }) => [id, {
        skill: { id, name }, demand: 0, supply: 0, covered: _count.matchCoverage > 0,
      }]));
      for (const row of counts) {
        const skill = bySkill.get(row.skillId)!;
        if (row.kind === 'LEARN') skill.demand = row._count._all;
        else skill.supply = row._count._all;
      }
      const skills = [...bySkill.values()].filter(({ demand, supply }) => demand > 0 || supply > 0);
      const gap: SkillGap[] = skills.map(({ skill, demand, supply }) => ({
        skill, demand, supply, gap: demand - supply,
      })).sort((a, b) => b.gap - a.gap);
      const insight = ({ skill, demand, supply }: SkillGap): SkillInsight => ({ skill, demand, supply });

      const rounds = await tx.round.findMany({
        orderBy: [{ openedAt: 'asc' }, { id: 'asc' }],
        select: { id: true, closedAt: true },
      });
      const matchCounts = await tx.match.groupBy({ by: ['roundId', 'status'], _count: { _all: true } });
      const byRound = new Map<string, Partial<Record<MatchStatus, number>>>();
      for (const row of matchCounts) {
        const statuses = byRound.get(row.roundId) ?? {};
        statuses[row.status] = row._count._all;
        byRound.set(row.roundId, statuses);
      }
      const closed: AnalyticsView['outcomes']['closed'] = {
        COMPLETED: 0, LAPSED: 0, DECLINED: 0, TERMINATED_BY_ADMIN: 0,
      };
      let open: AnalyticsView['outcomes']['open'] = null;
      const perRound: AnalyticsView['completion']['perRound'] = [];
      for (const [index, round] of rounds.entries()) {
        const statuses = byRound.get(round.id) ?? {};
        const roundNumber = index + 1;
        if (round.closedAt === null) {
          open = { roundNumber, MATCHED: statuses.MATCHED ?? 0, ACCEPTED: statuses.ACCEPTED ?? 0 };
        } else {
          for (const status of Object.keys(closed) as (keyof typeof closed)[]) closed[status] += statuses[status] ?? 0;
          const total = Object.values(statuses).reduce((sum, count) => sum + count, 0);
          perRound.push({ roundNumber, ...completion(statuses.COMPLETED ?? 0, total) });
        }
      }
      return {
        skills: {
          mostRequested: skills.filter(({ demand }) => demand > 0).sort((a, b) => b.demand - a.demand)
            .map(({ skill, demand }) => ({ skill, demand })),
          mostAvailable: skills.filter(({ supply }) => supply > 0).sort((a, b) => b.supply - a.supply)
            .map(({ skill, supply }) => ({ skill, supply })),
          gap,
        },
        insights: {
          gap: gap.filter((row) => row.gap > 0).map(insight),
          uncovered: gap.filter((row) => row.demand > 0 && row.supply > 0 && !bySkill.get(row.skill.id)!.covered).map(insight),
        },
        completion: {
          overall: completion(closed.COMPLETED, perRound.reduce((sum, round) => sum + round.total, 0)),
          perRound,
        },
        outcomes: { closed, open },
      };
    });
  }
}
