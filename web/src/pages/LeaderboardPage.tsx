import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { leaderboardQueryOptions, type LeaderboardPosition } from '../api/leaderboard';
import { Banner, Button, EmptyState, TrophyIcon } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';

function PositionRow({ position, student }: { position: LeaderboardPosition; student: ReactNode }): React.JSX.Element {
  const { formatNumber } = useI18n();
  return (
    <tr className="border-t border-line">
      <td className="p-2 text-end whitespace-nowrap tabular-nums sm:p-3"><bdi>{formatNumber(position.rank)}</bdi></td>
      <th scope="row" className="p-2 text-start font-medium wrap-anywhere sm:p-3">{student}</th>
      <td className="p-2 text-end whitespace-nowrap tabular-nums sm:p-3"><bdi>{formatNumber(position.xp)}</bdi></td>
      <td className="p-2 text-end whitespace-nowrap tabular-nums sm:p-3"><bdi>{formatNumber(position.level)}</bdi></td>
    </tr>
  );
}

export function LeaderboardPage(): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = t.leaderboard;
  const leaderboard = useQuery(leaderboardQueryOptions());
  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6">
      <PageTitle name={copy.title} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{copy.description}</p>
        <Link to="/rules" className="self-start rounded text-sm text-link underline underline-offset-2 focus-ring">
          {t.progress.rules.link}
        </Link>
      </div>
      {leaderboard.isError ? (
        <>
          <Banner tone="danger" title={errorText(failureCode(leaderboard.error))} />
          <Button className="self-start" loading={leaderboard.isFetching} onClick={() => void leaderboard.refetch()}>{copy.retry}</Button>
        </>
      ) : leaderboard.data === undefined ? (
        <p role="status" aria-busy="true">{copy.loading}</p>
      ) : leaderboard.data.top.length === 0 ? (
        <EmptyState icon={<TrophyIcon size={24} />} title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full table-auto border-collapse text-sm">
            <caption className="sr-only">{copy.caption}</caption>
            <thead className="bg-canvas">
              <tr>
                <th scope="col" className="w-px p-2 text-end font-semibold whitespace-nowrap sm:p-3">{copy.rank}</th>
                <th scope="col" className="p-2 text-start font-semibold whitespace-nowrap sm:p-3">{copy.student}</th>
                <th scope="col" className="w-px p-2 text-end font-semibold whitespace-nowrap sm:p-3">{copy.xp}</th>
                <th scope="col" className="w-px p-2 text-end font-semibold whitespace-nowrap sm:p-3">{copy.level}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.data.top.map((entry) => (
                <PositionRow key={entry.student.id} position={entry} student={<StudentLink student={entry.student} />} />
              ))}
            </tbody>
            {leaderboard.data.me !== null ? (
              <tfoot className="bg-primary-50">
                <PositionRow position={leaderboard.data.me} student={copy.yourPosition} />
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
    </div>
  );
}
