import { useQuery } from '@tanstack/react-query';
import { analyticsQueryOptions } from '../api/analytics';
import { AnalyticsBars, CompletionChart } from '../analytics/AnalyticsCharts';
import { Banner, Button, SkillName } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { failureCode } from '../profile/failure';

export function AdminAnalyticsPage(): React.JSX.Element {
  const { t, format, formatNumber, errorText } = useI18n();
  const copy = t.analytics;
  const analytics = useQuery(analyticsQueryOptions());
  const data = analytics.data;
  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-8">
      <PageTitle name={copy.title} />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">{copy.description}</p>
        <p className="text-xs text-ink-muted">{copy.freshness}</p>
      </header>
      {analytics.isError ? <div className="flex flex-col items-start gap-3">
        <Banner tone="danger" title={errorText(failureCode(analytics.error))} />
        <Button loading={analytics.isFetching} onClick={() => void analytics.refetch()}>{copy.retry}</Button>
      </div> : data === undefined ? <p role="status" aria-busy="true">{copy.loading}</p> : <>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-ink">{copy.insights}</h2>
          {data.insights.gap.length === 0 && data.insights.uncovered.length === 0 ? (
            <p className="text-sm text-ink-muted">{copy.noInsights}</p>
          ) : <ul className="flex max-w-prose list-disc flex-col gap-2 ps-5 text-sm leading-relaxed text-ink">
            {data.insights.gap.map((row) => <li key={`gap-${row.skill.id}`}>
              {row.supply === 0
                ? format(copy.unoffered, { count: row.demand, skill: <SkillName name={row.skill.name} /> })
                : format(copy.undersupplied, { demand: row.demand, supply: row.supply, skill: <SkillName name={row.skill.name} /> })}
            </li>)}
            {data.insights.uncovered.map((row) => <li key={`uncovered-${row.skill.id}`}>
              {format(copy.uncovered, { demand: row.demand, supply: row.supply, skill: <SkillName name={row.skill.name} /> })}
            </li>)}
          </ul>}
        </section>
        <section className="flex min-w-0 flex-col gap-5">
          <p className="max-w-prose text-sm text-ink-muted">{copy.pool}</p>
          <AnalyticsBars title={copy.requested} xTitle={copy.skill} name={copy.demand}
            rows={data.skills.mostRequested.map(({ skill, demand }) => ({ label: skill.name, value: demand }))} />
          <AnalyticsBars title={copy.available} xTitle={copy.skill} name={copy.supply}
            rows={data.skills.mostAvailable.map(({ skill, supply }) => ({ label: skill.name, value: supply }))} />
          <AnalyticsBars title={copy.gap} description={copy.gapDescription} xTitle={copy.skill} name={copy.difference}
            rows={data.skills.gap.map(({ skill, demand, supply, gap }) => ({ label: skill.name, value: gap, demand, supply }))} />
        </section>
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-ink">{copy.completion}</h2>
            <p className="max-w-prose text-sm text-ink-muted">{copy.closedOnly}</p>
            {data.completion.overall.rate === null ? <p className="text-sm text-ink-muted">{copy.noRate}</p> : <>
              <p className="text-lg font-semibold text-ink">{format(copy.overall, {
                rate: <bdi className="tabular-nums">{formatNumber(data.completion.overall.rate / 100,
                  { style: 'percent', maximumFractionDigits: 0 })}</bdi>,
              })}</p>
              <p className="text-sm text-ink-muted">{format(copy.completionCounts, data.completion.overall)}</p>
            </>}
          </div>
          <CompletionChart rounds={data.completion.perRound} />
        </section>
        <div className="grid min-w-0 gap-8 lg:grid-cols-2">
          {data.outcomes.open === null ? <section className="border-t border-line pt-5">
            <h2 className="text-base font-semibold text-ink">{copy.openState}</h2>
            <p className="mt-2 text-sm text-ink-muted">{copy.noOpenRound}</p>
          </section> : <AnalyticsBars title={copy.openState} xTitle={copy.status} name={copy.matches} unit={copy.matches}
            description={format(copy.openDescription, { number: data.outcomes.open.roundNumber })}
            rows={(['MATCHED', 'ACCEPTED'] as const).map((status) => ({ label: t.matching.statuses[status], value: data.outcomes.open![status] }))} />}
          <AnalyticsBars title={copy.closedOutcomes} description={copy.outcomesDescription} xTitle={copy.status} name={copy.matches} unit={copy.matches}
            rows={(['COMPLETED', 'LAPSED', 'DECLINED', 'TERMINATED_BY_ADMIN'] as const).map((status) => ({
              label: t.matching.statuses[status], value: data.outcomes.closed[status],
            }))} />
        </div>
      </>}
    </div>
  );
}
