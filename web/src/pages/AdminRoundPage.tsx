import { useMemo } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { isUuid } from '@shared/uuid';
import { ApiProtocolError } from '../api/client';
import { adminRoundQueryOptions, type AdminRoundMatch } from '../api/matches';
import { AlertIcon, Button, Card, DataTable, EmptyState } from '../design';
import { useI18n } from '../i18n/context';
import { NotFoundPage, PageTitle } from '../layout';
import { MatchStatusLabel } from '../matching/MatchParts';
import { UnmatchedCard } from '../matching/UnmatchedCard';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';

const column = createColumnHelper<AdminRoundMatch>();

export function AdminRoundPage(): React.JSX.Element {
  const { t, format, formatText, formatDateTime, personNameValue, errorText } = useI18n();
  const copy = t.matching.round;
  const rounds = t.matching.rounds;
  const { roundId } = useParams({ from: '/admin/rounds/$roundId' });
  const wellFormedId = isUuid(roundId);
  const detail = useQuery({ ...adminRoundQueryOptions(roundId), enabled: wellFormedId });

  const columns = useMemo(
    () => [
      column.display({
        id: 'mentor',
        header: copy.columns.mentor,
        cell: ({ row }) => <StudentLink student={row.original.mentor} />,
      }),
      column.display({
        id: 'mentee',
        header: copy.columns.mentee,
        cell: ({ row }) => <StudentLink student={row.original.mentee} />,
      }),
      column.display({
        id: 'status',
        header: copy.columns.status,
        cell: ({ row }) => (
          <span className="flex flex-col items-start gap-1">
            <MatchStatusLabel status={row.original.status} />
            {row.original.handMade ? (
              <span className="text-xs text-ink-muted">{t.matching.match.handMade}</span>
            ) : null}
          </span>
        ),
      }),
      column.display({
        id: 'mission',
        header: copy.columns.mission,
        cell: ({ row }) => t.matching.missions[row.original.mission],
      }),
      column.display({
        id: 'view',
        header: () => (
          <span className="relative">
            <span className="sr-only">{copy.view}</span>
          </span>
        ),
        cell: ({ row }) => (
          <Link
            to="/admin/matches/$matchId"
            params={{ matchId: row.original.id }}
            aria-label={formatText(copy.viewNamed, {
              mentor: personNameValue(row.original.mentor.displayName, row.original.mentor.removed),
              mentee: personNameValue(row.original.mentee.displayName, row.original.mentee.removed),
            })}
            className="rounded font-medium text-link underline-offset-2 hover:underline focus-ring"
          >
            {copy.view}
          </Link>
        ),
      }),
    ],
    [copy, t, formatText, personNameValue],
  );

  if (!wellFormedId) return <NotFoundPage />;

  const data = detail.data;
  if (data === undefined) {
    if (detail.isError && detail.error instanceof ApiProtocolError && detail.error.status === 404) {
      return <NotFoundPage />;
    }
    return (
      <>
        <PageTitle name={rounds.title} />
        {detail.isError ? (
          <>
            <h1 className="sr-only">{errorText(failureCode(detail.error))}</h1>
            <EmptyState
              icon={<AlertIcon size={24} />}
              title={errorText(failureCode(detail.error))}
              action={
                <Button variant="secondary" onClick={() => void detail.refetch()}>
                  {t.matching.match.retry}
                </Button>
              }
            />
          </>
        ) : (
          <p aria-busy="true" className="text-sm text-ink-muted">
            {copy.loading}
          </p>
        )}
      </>
    );
  }

  const { round } = data;
  return (
    <>
      <PageTitle name={formatText(copy.title, { number: round.number })} />
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{format(copy.title, { number: round.number })}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {format(rounds.openedOn, { date: formatDateTime(new Date(round.openedAt)) })}
          </p>
          <p className="text-sm text-ink-muted">
            {round.closedAt === null
              ? rounds.stillOpen
              : format(rounds.closedOn, { date: formatDateTime(new Date(round.closedAt)) })}
          </p>
        </div>
        <Card title={copy.matchesTitle} headingLevel={2}>
          <DataTable
            data={data.matches}
            columns={columns}
            getRowId={(row) => row.id}
            total={data.matches.length}
            page={1}
            pageSize={Math.max(data.matches.length, 1)}
            sorting={[]}
            onSortingChange={() => undefined}
            onPageChange={() => undefined}
            caption={copy.caption}
            emptyTitle={copy.emptyTitle}
          />
        </Card>
        {data.unmatched !== null ? <UnmatchedCard roundId={round.id} students={data.unmatched} /> : null}
        <Link to="/admin/rounds" className="self-start rounded text-link underline underline-offset-2 focus-ring">
          {copy.roundsLink}
        </Link>
      </div>
    </>
  );
}
