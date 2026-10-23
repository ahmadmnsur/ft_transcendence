import { useEffect, useEffectEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RESOLVED_PAGE_SIZE, resolvedAuditQueryOptions, targetKey, type ResolvedBatch } from '../api/moderation';
import { Button, Card, EmptyState, FlagIcon, Pagination, PersonName, RoleLabel } from '../design';
import { countPages } from '../design/components/pages';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { ReportedTarget, ReportRows } from './ReportedTarget';

function batchKey(batch: ResolvedBatch): string {
  return `${targetKey(batch.target)}|${batch.resolvedBy.id}|${batch.resolvedAt}|${batch.state}`;
}

// §12.6: an Admin's resolved audit, one entry per resolution, newest first:
// what it was about, who resolved it and when, and every Report it closed
// with its reporter. A batch about the viewing Admin or holding their Report
// is left out by the server. A page past the last one, such as an old address,
// moves to the last one once the total is known.
export function ResolvedAudit({ page, onPageChange }: { page: number; onPageChange: (page: number) => void }): React.JSX.Element {
  const { t, format, formatText, formatDateTime, errorText } = useI18n();
  const copy = t.moderation;
  const audit = useQuery(resolvedAuditQueryOptions(page));
  const lastPage = audit.data === undefined ? 1 : countPages({ total: audit.data.total, pageSize: RESOLVED_PAGE_SIZE });
  const correctingPage = audit.isSuccess && page > lastPage;
  const settlePage = useEffectEvent((next: number) => onPageChange(next));
  useEffect(() => {
    if (correctingPage) settlePage(lastPage);
  }, [correctingPage, lastPage]);

  // The resolver carries the Admin label like any Admin another Student sees
  // (§12.8).
  function heading(batch: ResolvedBatch): React.ReactNode {
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
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-sm text-ink-danger">{errorText(failureCode(audit.error))}</p>
        <Button variant="secondary" size="sm" onClick={() => void audit.refetch()}>
          {copy.retry}
        </Button>
      </div>
    );
  }
  if (audit.data === undefined || correctingPage) {
    return (
      <p role="status" aria-busy="true" className="text-sm text-ink-muted">
        {copy.loading}
      </p>
    );
  }
  if (audit.data.total === 0) {
    return <EmptyState icon={<FlagIcon />} title={copy.audit.emptyTitle} description={copy.audit.emptyDescription} />;
  }
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ul className="flex min-w-0 flex-col gap-4">
        {audit.data.items.map((batch) => (
          <li key={batchKey(batch)} className="min-w-0">
            <Card
              headingLevel={2}
              title={heading(batch)}
              subtitle={
                <span className="flex flex-wrap gap-x-3">
                  <time dateTime={batch.resolvedAt}>{formatDateTime(new Date(batch.resolvedAt))}</time>
                  <span>{formatText(copy.queue.reportCount, { count: batch.reports.length })}</span>
                </span>
              }
            >
              <div className="flex min-w-0 flex-col gap-4">
                <ReportedTarget target={batch.target} admin />
                <ReportRows reports={batch.reports} />
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        pageSize={RESOLVED_PAGE_SIZE}
        total={audit.data.total}
        onPageChange={onPageChange}
        label={copy.audit.paginationLabel}
      />
    </div>
  );
}
