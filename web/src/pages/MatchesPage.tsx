import { useMemo } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { PAGING } from '@shared/limits';
import { matchHistoryQueryOptions, type MatchView } from '../api/matches';
import { DataTable } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { MatchStatusLabel } from '../matching/MatchParts';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';

// `/matches`' one search param: the page, absent on the first.
export interface MatchesSearch {
  page?: number;
}

// §3.5.2: a page the API would refuse is dropped here, so an edited address
// never sends a failing request.
export function parseMatchesSearch(search: Record<string, unknown>): MatchesSearch {
  const page = search.page;
  return { page: typeof page === 'number' && Number.isSafeInteger(page) && page > 1 ? page : undefined };
}

const column = createColumnHelper<MatchView>();

// §3.5.1, §6.6: `/matches`, the signed-in Student's own Matches, every status,
// newest first. No profile lists Matches (§4.6): this is the only list of
// them, and only its owner sees it. The table is not sorted by the reader.
export function MatchesPage(): React.JSX.Element {
  const { t, formatText, formatNumber, errorText } = useI18n();
  const copy = t.matching.history;
  const parts = t.matching.match;
  const search = useSearch({ from: '/matches' });
  const navigate = useNavigate({ from: '/matches' });
  const page = search.page ?? 1;
  const history = useQuery(matchHistoryQueryOptions(page, PAGING.defaultPageSize));

  const columns = useMemo(
    () => [
      column.display({
        id: 'round',
        header: copy.columns.round,
        meta: { align: 'end' },
        cell: ({ row }) => formatNumber(row.original.roundNumber),
      }),
      column.display({
        id: 'partner',
        header: copy.columns.partner,
        cell: ({ row }) => <StudentLink student={row.original.partner} />,
      }),
      column.display({
        id: 'role',
        header: copy.columns.role,
        cell: ({ row }) => (row.original.myRole === 'MENTOR' ? parts.mentorLabel : parts.menteeLabel),
      }),
      column.display({
        id: 'status',
        header: copy.columns.status,
        cell: ({ row }) => <MatchStatusLabel status={row.original.status} />,
      }),
      column.display({
        id: 'score',
        header: copy.columns.score,
        meta: { align: 'end' },
        cell: ({ row }) =>
          row.original.compatibilityScore === null ? copy.handMade : formatNumber(row.original.compatibilityScore),
      }),
      column.display({
        id: 'view',
        // Read by screen readers only. The `relative` wrapper keeps the
        // absolutely placed `sr-only` text inside the table's scroll frame,
        // so it never widens the page at 360 px.
        header: () => (
          <span className="relative">
            <span className="sr-only">{copy.view}</span>
          </span>
        ),
        cell: ({ row }) => (
          <Link
            to="/matches/$matchId"
            params={{ matchId: row.original.id }}
            aria-label={formatText(copy.viewNamed, { number: row.original.roundNumber })}
            className="rounded font-medium text-link underline-offset-2 hover:underline focus-ring"
          >
            {copy.view}
          </Link>
        ),
      }),
    ],
    [copy, parts, formatNumber, formatText],
  );

  return (
    <>
      <PageTitle name={copy.title} />
      <div className="flex min-w-0 flex-col gap-6">
        <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
        <DataTable
          data={history.data?.items ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          total={history.data?.total ?? 0}
          page={page}
          pageSize={PAGING.defaultPageSize}
          sorting={[]}
          onSortingChange={() => undefined}
          onPageChange={(next) => void navigate({ search: { page: next > 1 ? next : undefined } })}
          caption={copy.caption}
          emptyTitle={copy.emptyTitle}
          emptyDescription={copy.emptyDescription}
          loading={history.isPending || history.isPlaceholderData}
          error={history.isError ? errorText(failureCode(history.error)) : undefined}
          onRetry={() => void history.refetch()}
        />
        <Link to="/match" className="self-start rounded text-link underline underline-offset-2 focus-ring">
          {copy.currentLink}
        </Link>
      </div>
    </>
  );
}
