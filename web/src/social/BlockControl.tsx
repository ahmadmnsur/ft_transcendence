import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addBlock, blocksQueryOptions, liftBlock } from '../api/blocks';
import { studentQueryKey, type StudentRef } from '../api/profile';
import { sessionQueryOptions } from '../api/session';
import { Banner, Button, Modal } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import type { ControlParts } from './parts';

type Status = { kind: 'blocked' } | { kind: 'unblocked' } | { kind: 'failed'; code: unknown };

export function useBlockControl(student: StudentRef): ControlParts | null {
  const { t, formatText, personNameValue, errorText } = useI18n();
  const actions = t.social.actions;
  const copy = t.social.profile;
  const queryClient = useQueryClient();
  const { data: session } = useQuery(sessionQueryOptions());
  const blocks = useQuery(blocksQueryOptions());
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const statusRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const blocked = blocks.data?.items.some((item) => item.student.id === student.id) ?? false;

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (blocked) setConfirming(false);
  }, [blocked]);

  const viewerId = session?.authenticated === true ? session.student.id : null;
  if (viewerId === null || viewerId === student.id) return null;

  const name = personNameValue(student.displayName, student.removed);

  if (blocks.data === undefined) {
    if (!blocks.isError) return null;
    return {
      status: (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-ink-danger">
            {errorText(failureCode(blocks.error))}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void blocks.refetch()}>
            {actions.retry}
          </Button>
        </div>
      ),
      note: null,
      buttons: null,
      dialog: null,
    };
  }

  if (!blocked && student.removed && status === undefined) return null;

  function onFailure(error: unknown): void {
    void queryClient.invalidateQueries({ queryKey: studentQueryKey(student.id) });
    setStatus({ kind: 'failed', code: failureCode(error) });
  }

  async function onBlock(): Promise<void> {
    if (pending) return;
    setPending(true);
    try {
      await addBlock(queryClient, student.id);
      setStatus({ kind: 'blocked' });
    } catch (error) {
      onFailure(error);
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  async function onUnblock(): Promise<void> {
    if (pending) return;
    setPending(true);
    setStatus(undefined);
    try {
      await liftBlock(queryClient, student.id);
      setStatus({ kind: 'unblocked' });
    } catch (error) {
      onFailure(error);
    } finally {
      setPending(false);
    }
  }

  const unblockedText = student.removed ? actions.unblockedRemoved : actions.unblocked;

  return {
    status:
      status === undefined ? null : (
        <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
          {status.kind === 'failed' ? (
            <Banner tone="danger" title={errorText(status.code)} />
          ) : (
            <Banner
              tone="success"
              title={formatText(status.kind === 'blocked' ? actions.blocked : unblockedText, { name })}
            />
          )}
        </div>
      ),
    note: blocked ? <p className="text-sm text-ink-muted">{copy.blockedNote}</p> : null,
    buttons: blocked ? (
      <Button key="unblock" variant="secondary" size="sm" loading={pending} onClick={() => void onUnblock()}>
        {pending ? actions.unblocking : actions.unblock}
      </Button>
    ) : student.removed ? null : (
      <Button
        key="block"
        variant="danger-secondary"
        size="sm"
        onClick={() => {
          setStatus(undefined);
          setConfirming(true);
        }}
      >
        {actions.block}
      </Button>
    ),
    dialog: (
      <Modal
        open={confirming}
        size="sm"
        title={formatText(copy.confirmTitle, { name })}
        description={formatText(copy.confirmBody, { name })}
        onClose={() => {
          if (!pending) setConfirming(false);
        }}
        initialFocusRef={cancelRef}
        footer={
          <>
            <Button
              ref={cancelRef}
              variant="secondary"
              onClick={() => {
                if (!pending) setConfirming(false);
              }}
            >
              {actions.cancel}
            </Button>
            <Button variant="danger" loading={pending} onClick={() => void onBlock()}>
              {pending ? actions.blocking : copy.confirm}
            </Button>
          </>
        }
      />
    ),
  };
}

export function BlockControl({ student }: { student: StudentRef }): React.JSX.Element | null {
  const parts = useBlockControl(student);
  if (parts === null) return null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {parts.status}
      {parts.note === null && parts.buttons === null ? null : (
        <div className="flex flex-wrap items-center gap-3">
          {parts.note}
          {parts.buttons}
        </div>
      )}
      {parts.dialog}
    </div>
  );
}
