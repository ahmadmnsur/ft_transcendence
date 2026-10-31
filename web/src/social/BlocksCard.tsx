import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { blocksQueryOptions, liftBlock } from '../api/blocks';
import type { StudentRef } from '../api/profile';
import { AlertIcon, Banner, Button, Card, EmptyState, UserIcon } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';

type Status = { kind: 'unblocked'; student: StudentRef } | { kind: 'failed'; code: unknown };

export function BlocksCard(): React.JSX.Element {
  const { t, formatText, formatDate, personNameValue, errorText } = useI18n();
  const actions = t.social.actions;
  const copy = t.social.blocks;
  const queryClient = useQueryClient();
  const blocks = useQuery(blocksQueryOptions());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  async function onUnblock(student: StudentRef): Promise<void> {
    if (pendingId !== null) return;
    setPendingId(student.id);
    setStatus(undefined);
    try {
      await liftBlock(queryClient, student.id);
      setStatus({ kind: 'unblocked', student });
    } catch (error) {
      setStatus({ kind: 'failed', code: failureCode(error) });
    } finally {
      setPendingId(null);
    }
  }

  let body: React.ReactNode;
  if (blocks.data === undefined) {
    body = blocks.isError ? (
      <EmptyState
        icon={<AlertIcon size={24} />}
        title={errorText(failureCode(blocks.error))}
        action={
          <Button variant="secondary" onClick={() => void blocks.refetch()}>
            {actions.retry}
          </Button>
        }
      />
    ) : (
      <p aria-busy="true" className="text-sm text-ink-muted">
        {copy.loading}
      </p>
    );
  } else if (blocks.data.items.length === 0) {
    body = <EmptyState icon={<UserIcon size={24} />} title={copy.emptyTitle} description={copy.emptyDescription} />;
  } else {
    body = (
      <ul className="flex min-w-0 flex-col divide-y divide-line">
        {blocks.data.items.map((block) => {
          const name = personNameValue(block.student.displayName, block.student.removed);
          const rowPending = pendingId === block.student.id;
          return (
            <li key={block.student.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <StudentLink student={block.student} />
                <p className="mt-0.5 text-sm text-ink-muted">
                  {formatText(copy.blockedOn, { date: formatDate(new Date(block.createdAt)) })}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={rowPending}
                aria-disabled={pendingId !== null && !rowPending ? true : undefined}
                aria-label={rowPending ? undefined : formatText(copy.unblockNamed, { name })}
                onClick={() => void onUnblock(block.student)}
              >
                {rowPending ? actions.unblocking : actions.unblock}
              </Button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      <div className="flex min-w-0 flex-col gap-4">
        {status !== undefined ? (
          <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
            {status.kind === 'failed' ? (
              <Banner tone="danger" title={errorText(status.code)} />
            ) : (
              <Banner
                tone="success"
                title={formatText(status.student.removed ? actions.unblockedRemoved : actions.unblocked, {
                  name: personNameValue(status.student.displayName, status.student.removed),
                })}
              />
            )}
          </div>
        ) : null}
        {body}
      </div>
    </Card>
  );
}
