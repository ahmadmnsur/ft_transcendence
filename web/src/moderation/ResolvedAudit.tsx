import { useEffect, useEffectEvent, useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RESOLVED_PAGE_SIZE, resolvedAuditQueryOptions, targetKey, type ResolvedBatch } from '../api/moderation';
import { AlertIcon, Button, Card, EmptyState, FlagIcon, Pagination, PersonName, RoleLabel } from '../design';
import { countPages } from '../design/components/pages';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { MetaLine, OpenInUsers, ReportedTarget, ReportRows, TargetHeading } from './ReportedTarget';

function batchKey(batch: ResolvedBatch): string {
  return `${targetKey(batch.target)}|${batch.resolvedBy.id}|${batch.resolvedAt}|${batch.state}`;
}

function ResolvedCard({ batch, verdict }: { batch: ResolvedBatch; verdict: React.ReactNode }): React.JSX.Element {
  const { t, format, formatText, formatDateTime, personNameValue } = useI18n();
  const copy = t.moderation;
  const headingId = useId();
  const { target } = batch;
  const person = target.kind === 'STUDENT' ? target.student : target.post.author;
  const authorName = target.kind === 'POST' ? personNameValue(person.displayName, person.removed) : undefined;
  return (
    <Card
      headingLevel={2}
      title={<TargetHeading target={target} id={headingId} />}
      subtitle={
        <MetaLine>
          <span className="font-medium text-ink">{verdict}</span>
          <span>
            {format(copy.audit.resolvedAt, {
              time: <time dateTime={batch.resolvedAt}>{formatDateTime(new Date(batch.resolvedAt))}</time>,
            })}
          </span>
          <span>{formatText(copy.queue.reportCount, { count: batch.reports.length })}</span>
        </MetaLine>
      }
      actions={<OpenInUsers studentId={person.id} name={authorName} describedBy={headingId} />}
    >
      <div className="flex min-w-0 flex-col gap-4">
        {target.kind === 'POST' ? <ReportedTarget post={target.post} /> : null}
        <ReportRows reports={batch.reports} />
      </div>
    </Card>
  );
}

export function ResolvedAudit({ page, onPageChange }: { page: number; onPageChange: (page: number) => void }): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const copy = t.moderation;
  const audit = useQuery(resolvedAuditQueryOptions(page));
  const lastPage = audit.data === undefined ? 1 : countPages({ total: audit.data.total, pageSize: RESOLVED_PAGE_SIZE });
  const pastLast = page > lastPage;
  const correctingPage = audit.isSuccess && !audit.isPlaceholderData && audit.fetchStatus === 'idle' && pastLast;
  const loading = audit.isPlaceholderData || pastLast;
  const settlePage = useEffectEvent((next: number) => onPageChange(next));
  useEffect(() => {
    if (correctingPage) settlePage(lastPage);
  }, [correctingPage, lastPage]);

  function verdict(batch: ResolvedBatch): React.ReactNode {
    const resolver = batch.resolvedBy;
    const name = (
      <>
        <PersonName name={resolver.displayName} removed={resolver.removed} />
        {resolver.isAdmin && !resolver.removed ? <RoleLabel className="ms-2 align-middle" /> : null}
      </>
    );
    const headings = batch.target.kind === 'POST' ? copy.audit.resolvedBy.post : copy.audit.resolvedBy.student;
    return format(headings[batch.state], { name });
  }

  if (audit.isError) {
    return (
      <div role="alert">
        <EmptyState
          icon={<AlertIcon size={24} />}
          title={errorText(failureCode(audit.error))}
          action={
            <Button variant="secondary" onClick={() => void audit.refetch()}>
              {copy.retry}
            </Button>
          }
        />
      </div>
    );
  }
  const busy = (
    <p role="status" aria-busy="true" className="text-sm text-ink-muted">
      {copy.loading}
    </p>
  );
  if (audit.data === undefined) return busy;
  if (audit.data.total === 0 && !loading) {
    return <EmptyState icon={<FlagIcon size={24} />} title={copy.audit.emptyTitle} description={copy.audit.emptyDescription} />;
  }
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {loading ? (
        busy
      ) : (
        <ul className="flex min-w-0 flex-col gap-4">
          {audit.data.items.map((batch) => (
            <li key={batchKey(batch)} className="min-w-0">
              <ResolvedCard batch={batch} verdict={verdict(batch)} />
            </li>
          ))}
        </ul>
      )}
      {audit.data.total > 0 ? (
        <Pagination
          page={page}
          pageSize={RESOLVED_PAGE_SIZE}
          total={audit.data.total}
          onPageChange={onPageChange}
          label={copy.audit.paginationLabel}
        />
      ) : null}
    </div>
  );
}
