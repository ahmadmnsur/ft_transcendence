import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addBlock, blocksQueryOptions, liftBlock } from '../api/blocks';
import { studentQueryKey, type StudentRef } from '../api/profile';
import { sessionQueryOptions } from '../api/session';
import { Banner, Button, Modal } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';

// What the status Banner says, kept as what happened rather than as a text,
// so it follows a language switch: a Block, its lifting, or a failure's code.
type Status = { kind: 'blocked' } | { kind: 'unblocked' } | { kind: 'failed'; code: unknown };

// §6.4, §11.2–§11.3, ADR-0011 d13: Block and Unblock on profiles and in the report dialog. It
// shows once the viewer's own Blocks have loaded, never on the viewer's own
// profile, and a Removed Student offers only the lifting of a Block set
// before the Removal. Blocking asks first, since it ends any Friendship;
// lifting restores nothing and asks nothing.
export function BlockControl({ student }: { student: StudentRef }): React.JSX.Element | null {
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

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, since the button that was pressed is replaced.
  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  // A Block made elsewhere, in another tab, can reach the list while the
  // dialog is open; the dialog then closes, since confirming could only be
  // refused.
  useEffect(() => {
    if (blocked) setConfirming(false);
  }, [blocked]);

  const viewerId = session?.authenticated === true ? session.student.id : null;
  if (viewerId === null || viewerId === student.id) return null;

  const name = personNameValue(student.displayName, student.removed);

  if (blocks.data === undefined) {
    if (!blocks.isError) return null;
    return (
      <div className="order-first flex basis-full flex-wrap items-center gap-3">
        <p role="alert" className="text-sm text-ink-danger">
          {errorText(failureCode(blocks.error))}
        </p>
        <Button variant="secondary" size="sm" onClick={() => void blocks.refetch()}>
          {actions.retry}
        </Button>
      </div>
    );
  }

  // A Removed Student the viewer has not blocked offers no action, and an
  // empty box would still take a gap in the page's column.
  if (!blocked && student.removed && status === undefined) return null;

  // A refusal such as `student_removed` means the profile on screen is out
  // of date too, so it is read again beside the list.
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

  // A Removed Student can get no friend request, so lifting their Block
  // gives no advice about one.
  const unblockedText = student.removed ? actions.unblockedRemoved : actions.unblocked;

  // The pieces are items of the row of actions around it, on a profile and in
  // the report dialog; the status Banner and the note take lines of their own
  // above its button.
  return (
    <>
      {status !== undefined ? (
        <div ref={statusRef} tabIndex={-1} className="order-first basis-full rounded-lg focus-ring">
          {status.kind === 'failed' ? (
            <Banner tone="danger" title={errorText(status.code)} />
          ) : (
            <Banner
              tone="success"
              title={formatText(status.kind === 'blocked' ? actions.blocked : unblockedText, { name })}
            />
          )}
        </div>
      ) : null}
      {blocked ? (
        <>
          <p className="order-first basis-full text-sm text-ink-muted">{copy.blockedNote}</p>
          <Button variant="secondary" size="sm" loading={pending} onClick={() => void onUnblock()}>
            {pending ? actions.unblocking : actions.unblock}
          </Button>
        </>
      ) : student.removed ? null : (
        <div>
          <Button
            variant="danger-secondary"
            size="sm"
            onClick={() => {
              setStatus(undefined);
              setConfirming(true);
            }}
          >
            {actions.block}
          </Button>
        </div>
      )}
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
    </>
  );
}
