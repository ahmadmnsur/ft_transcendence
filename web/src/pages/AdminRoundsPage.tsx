import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { MATCH_STATUSES } from '@shared/matches';
import {
  adminRoundQueryOptions,
  adminRoundsQueryOptions,
  closeRound,
  openRound,
  type AdminRoundSummary,
  type OpenRoundResult,
} from '../api/matches';
import { AlertIcon, Banner, Button, Card, DataTable, EmptyState, Modal, PersonName } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { UnmatchedCard } from '../matching/UnmatchedCard';
import { failureCode } from '../profile/failure';

// What the last open or close reported, kept as what happened rather than as
// a text, so it follows a language switch.
type Notice =
  | { kind: 'opened'; result: OpenRoundResult }
  | { kind: 'closed'; number: number; lapsed: number }
  | { kind: 'failed'; code: unknown };

const column = createColumnHelper<AdminRoundSummary>();

// §3.5.1, §6.13, §8.4, §8.7, §8.9: `/admin/rounds`, an Admin's page for the
// matching cycle. The current Round with its Close button and its unmatched
// Students, or Open when none is open, then every Round so far with its
// counts per status. Both writes ask first: neither can be undone.
export function AdminRoundsPage(): React.JSX.Element {
  const { t, format, formatText, formatNumber, formatDateTime, errorText } = useI18n();
  const copy = t.matching.rounds;
  const queryClient = useQueryClient();
  const rounds = useQuery(adminRoundsQueryOptions());
  const current = rounds.data?.items.find((round) => round.closedAt === null);
  // The open Round's unmatched list comes from its own read, the one its page
  // makes, so both show the same list.
  const currentDetail = useQuery({ ...adminRoundQueryOptions(current?.id ?? ''), enabled: current !== undefined });
  const [pending, setPending] = useState<'open' | 'close' | null>(null);
  const [confirming, setConfirming] = useState<'open' | 'close' | null>(null);
  const [notice, setNotice] = useState<Notice | undefined>(undefined);
  const noticeRef = useRef<HTMLDivElement>(null);
  // Each dialog starts on its safe button.
  const keepClosedRef = useRef<HTMLButtonElement>(null);
  const keepOpenRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (notice !== undefined) noticeRef.current?.focus();
  }, [notice]);

  async function onOpen(): Promise<void> {
    if (pending !== null) return;
    setPending('open');
    try {
      const result = await openRound(queryClient);
      if (result !== undefined) setNotice({ kind: 'opened', result });
    } catch (error) {
      setNotice({ kind: 'failed', code: failureCode(error) });
    } finally {
      setConfirming(null);
      setPending(null);
    }
  }

  async function onClose(number: number): Promise<void> {
    if (pending !== null) return;
    setPending('close');
    try {
      const result = await closeRound(queryClient);
      if (result !== undefined) setNotice({ kind: 'closed', number, lapsed: result.lapsed });
    } catch (error) {
      setNotice({ kind: 'failed', code: failureCode(error) });
    } finally {
      setConfirming(null);
      setPending(null);
    }
  }

  const columns = useMemo(
    () => [
      column.display({
        id: 'round',
        header: copy.columns.round,
        cell: ({ row }) => (
          <Link
            to="/admin/rounds/$roundId"
            params={{ roundId: row.original.id }}
            className="rounded font-medium text-link underline-offset-2 hover:underline focus-ring"
          >
            {format(t.matching.match.roundNumber, { number: row.original.number })}
          </Link>
        ),
      }),
      column.display({
        id: 'opened',
        header: copy.columns.opened,
        cell: ({ row }) => formatDateTime(new Date(row.original.openedAt)),
      }),
      column.display({
        id: 'closed',
        header: copy.columns.closed,
        cell: ({ row }) =>
          row.original.closedAt === null ? copy.stillOpen : formatDateTime(new Date(row.original.closedAt)),
      }),
      ...MATCH_STATUSES.map((status) =>
        column.display({
          id: status,
          header: t.matching.statuses[status],
          meta: { align: 'end' },
          cell: ({ row }) => formatNumber(row.original.counts[status]),
        }),
      ),
    ],
    [copy, t, format, formatNumber, formatDateTime],
  );

  let currentBody: React.ReactNode;
  if (rounds.data === undefined) {
    currentBody = rounds.isError ? (
      <EmptyState
        icon={<AlertIcon size={24} />}
        title={errorText(failureCode(rounds.error))}
        action={
          <Button variant="secondary" onClick={() => void rounds.refetch()}>
            {t.matching.match.retry}
          </Button>
        }
      />
    ) : (
      <p aria-busy="true" className="text-sm text-ink-muted">
        {copy.loading}
      </p>
    );
  } else if (current !== undefined) {
    currentBody = (
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <p className="font-semibold text-ink">{format(copy.openNow, { number: current.number })}</p>
          <p className="text-sm text-ink-muted">{format(copy.openedOn, { date: formatDateTime(new Date(current.openedAt)) })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="danger" loading={pending === 'close'} onClick={() => setConfirming('close')}>
            {pending === 'close' ? copy.closing : format(copy.close, { number: current.number })}
          </Button>
          <Link
            to="/admin/rounds/$roundId"
            params={{ roundId: current.id }}
            className="rounded text-link underline underline-offset-2 focus-ring"
          >
            {format(copy.viewRound, { number: current.number })}
          </Link>
        </div>
      </div>
    );
  } else {
    currentBody = (
      <div className="flex min-w-0 flex-col items-start gap-3">
        <div>
          <p className="font-semibold text-ink">{copy.noneOpen}</p>
          <p className="text-sm text-ink-muted">{copy.noneOpenDescription}</p>
        </div>
        <Button loading={pending === 'open'} onClick={() => setConfirming('open')}>
          {pending === 'open' ? copy.opening : copy.open}
        </Button>
      </div>
    );
  }

  let noticeBanner: React.ReactNode = null;
  if (notice?.kind === 'failed') {
    noticeBanner = <Banner tone="danger" title={errorText(notice.code)} />;
  } else if (notice?.kind === 'opened') {
    const { result } = notice;
    noticeBanner = (
      <Banner
        tone="success"
        title={formatText(copy.opened, { number: result.round.number, count: result.matchCount })}
        body={
          result.unmatched.length === 0 ? undefined : (
            <>
              <p>{format(copy.openedUnmatched, { count: result.unmatched.length })}</p>
              <ul className="mt-1 list-disc ps-5">
                {result.unmatched.map((student) => (
                  <li key={student.id}>
                    <PersonName name={student.displayName} removed={student.removed} />
                  </li>
                ))}
              </ul>
            </>
          )
        }
      />
    );
  } else if (notice?.kind === 'closed') {
    noticeBanner = (
      <Banner tone="success" title={formatText(copy.closed, { number: notice.number, count: notice.lapsed })} />
    );
  }

  const rows = rounds.data?.items ?? [];
  return (
    <>
      <PageTitle name={copy.title} />
      <div className="flex min-w-0 flex-col gap-6">
        <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
        {noticeBanner !== null ? (
          <div ref={noticeRef} tabIndex={-1} className="rounded-lg focus-ring">
            {noticeBanner}
          </div>
        ) : null}
        <Card title={copy.currentTitle} headingLevel={2}>
          {currentBody}
        </Card>
        {current !== undefined ? (
          <UnmatchedCard
            students={currentDetail.data === undefined ? undefined : (currentDetail.data.unmatched ?? [])}
            error={currentDetail.isError ? currentDetail.error : undefined}
            onRetry={() => void currentDetail.refetch()}
          />
        ) : null}
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          total={rows.length}
          page={1}
          pageSize={Math.max(rows.length, 1)}
          sorting={[]}
          onSortingChange={() => undefined}
          onPageChange={() => undefined}
          caption={copy.caption}
          emptyTitle={copy.emptyTitle}
          loading={rounds.isPending}
          error={rounds.isError ? errorText(failureCode(rounds.error)) : undefined}
          onRetry={() => void rounds.refetch()}
        />
      </div>
      <Modal
        open={confirming === 'open'}
        size="sm"
        title={copy.openConfirm.title}
        description={copy.openConfirm.body}
        onClose={() => {
          if (pending === null) setConfirming(null);
        }}
        initialFocusRef={keepClosedRef}
        footer={
          <>
            <Button
              ref={keepClosedRef}
              variant="secondary"
              onClick={() => {
                if (pending === null) setConfirming(null);
              }}
            >
              {copy.openConfirm.cancel}
            </Button>
            <Button loading={pending === 'open'} onClick={() => void onOpen()}>
              {pending === 'open' ? copy.opening : copy.openConfirm.confirm}
            </Button>
          </>
        }
      />
      <Modal
        open={confirming === 'close' && current !== undefined}
        size="sm"
        title={current === undefined ? '' : formatText(copy.closeConfirm.title, { number: current.number })}
        description={copy.closeConfirm.body}
        onClose={() => {
          if (pending === null) setConfirming(null);
        }}
        initialFocusRef={keepOpenRef}
        footer={
          <>
            <Button
              ref={keepOpenRef}
              variant="secondary"
              onClick={() => {
                if (pending === null) setConfirming(null);
              }}
            >
              {copy.closeConfirm.cancel}
            </Button>
            <Button
              variant="danger"
              loading={pending === 'close'}
              onClick={() => {
                if (current !== undefined) void onClose(current.number);
              }}
            >
              {pending === 'close' ? copy.closing : copy.closeConfirm.confirm}
            </Button>
          </>
        }
      />
    </>
  );
}
