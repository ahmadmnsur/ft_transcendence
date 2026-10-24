import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { progressQueryOptions, readProgressAgain, type Progress } from '../api/progress';
import { Banner, Button, Card } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { subscribe } from '../realtime/socket';
import { LevelMeter } from './LevelMeter';

export function ProgressCard({ progress }: { progress: Progress }): React.JSX.Element {
  const { t, formatNumber, formatDate, formatText } = useI18n();
  return <Card title={t.progress.title} headingLevel={2}>
    <div className="flex min-w-0 flex-col gap-4">
      <LevelMeter progress={progress} />
      <dl className="flex items-baseline gap-3">
        <dt className="text-sm text-ink-muted">{t.profile.stats.streak}</dt>
        <dd className="font-semibold tabular-nums">{formatNumber(progress.streak)}</dd>
      </dl>
      <div>
        <h3 className="font-semibold">{t.progress.badges}</h3>
        {progress.badges.length === 0 ? <p className="mt-2 text-sm text-ink-muted">{t.progress.noBadges}</p> :
          <ul className="mt-2 flex flex-col divide-y divide-line">
            {progress.badges.map(({ badge, awardedAt }) => <li key={badge} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <span className="font-medium">{t.progress.badgeNames[badge]}</span>
              <time dateTime={awardedAt} className="text-sm text-ink-muted">{formatText(t.progress.awardedAt, { date: formatDate(new Date(awardedAt)) })}</time>
            </li>)}
          </ul>}
      </div>
      <Link to="/rules" className="self-start rounded text-link underline underline-offset-2 focus-ring">{t.progress.rules.link}</Link>
    </div>
  </Card>;
}

export function OwnProgressCard(): React.JSX.Element {
  const { t, errorText } = useI18n();
  const client = useQueryClient();
  const progress = useQuery(progressQueryOptions());
  useEffect(() => subscribe('round:closed', () => {
    void readProgressAgain(client);
  }), [client]);
  if (progress.data !== undefined) return <ProgressCard progress={progress.data} />;
  return <Card title={t.progress.title} headingLevel={2}>
    {progress.isError ? <div className="flex flex-col items-start gap-3">
      <Banner tone="danger" title={errorText(failureCode(progress.error))} />
      <Button variant="secondary" onClick={() => void progress.refetch()}>{t.progress.retry}</Button>
    </div> : <p aria-busy="true" className="text-sm text-ink-muted">{t.progress.loading}</p>}
  </Card>;
}
