import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { POST_GROUP_ACTIONS, STUDENT_GROUP_ACTIONS, type PostGroupAction, type StudentGroupAction } from '@shared/reports';
import {
  moderationQueueQueryOptions,
  resolveGroup,
  targetKey,
  type GroupAction,
  type QueueGroup,
  type Resolution,
} from '../api/moderation';
import { Banner, Button, Card, EmptyState, FlagIcon, Modal } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { ReportedTarget, ReportRows } from './ReportedTarget';

// What the last action answered, kept as data so its sentence follows the
// language switcher (§3.5.5): the action and what it wrote, or the code it
// was refused with.
type Notice = { kind: 'resolved'; action: GroupAction; resolution: Resolution } | { kind: 'failed'; code: unknown };

// One open group and its two actions, each confirmed first: an action is
// final and resolves every Report the group holds (§12.5). The answer goes
// to the queue's notice, which outlives the card: a resolved group leaves the
// queue when it is read again.
function QueueGroupCard({
  group,
  admin,
  onDone,
}: {
  group: QueueGroup;
  admin: boolean;
  onDone: (notice: Notice) => void;
}): React.JSX.Element {
  const { t, formatText, personNameValue } = useI18n();
  const copy = t.moderation;
  const queryClient = useQueryClient();
  const actions: readonly GroupAction[] = group.target.kind === 'POST' ? POST_GROUP_ACTIONS : STUDENT_GROUP_ACTIONS;
  // The action stays set while its dialog closes, so the dialog keeps its text.
  const [confirming, setConfirming] = useState(false);
  const [chosen, setChosen] = useState<GroupAction>('DISMISS');
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { target, count } = group;
  const name = target.kind === 'STUDENT' ? personNameValue(target.student.displayName, target.student.removed) : '';

  // The chosen action is one of this kind's own (`actions` above).
  function description(action: GroupAction): string {
    return target.kind === 'POST'
      ? formatText(copy.actions.confirmBody.post[action as PostGroupAction], { count })
      : formatText(copy.actions.confirmBody.student[action as StudentGroupAction], { count, name });
  }

  async function resolve(action: GroupAction): Promise<void> {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    let resolution: Resolution | null;
    try {
      resolution = await resolveGroup(queryClient, target, action);
    } catch (error) {
      setConfirming(false);
      onDone({ kind: 'failed', code: failureCode(error) });
      return;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
    // Null: another Student signed in meanwhile, and nothing is shown.
    if (resolution === null) return;
    setConfirming(false);
    onDone({ kind: 'resolved', action, resolution });
  }

  return (
    <Card
      headingLevel={2}
      title={target.kind === 'POST' ? copy.queue.postGroup : copy.queue.studentGroup}
      subtitle={formatText(copy.queue.reportCount, { count })}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <ReportedTarget target={target} admin={admin} />
        <ReportRows reports={group.reports} />
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action}
              size="sm"
              variant={action === 'REMOVE_POST' ? 'danger-secondary' : 'secondary'}
              aria-haspopup="dialog"
              onClick={() => {
                setChosen(action);
                setConfirming(true);
              }}
            >
              {copy.actions.label[action]}
            </Button>
          ))}
        </div>
      </div>
      <Modal
        open={confirming}
        title={copy.actions.confirmTitle[chosen]}
        description={description(chosen)}
        initialFocusRef={cancelRef}
        onClose={() => {
          if (!pendingRef.current) setConfirming(false);
        }}
        footer={
          <>
            <Button ref={cancelRef} variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
              {copy.actions.cancel}
            </Button>
            <Button
              variant={chosen === 'REMOVE_POST' ? 'danger' : 'primary'}
              loading={pending}
              onClick={() => void resolve(chosen)}
            >
              {pending ? copy.actions.working : copy.actions.label[chosen]}
            </Button>
          </>
        }
      />
    </Card>
  );
}

function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }): React.JSX.Element {
  const { t, formatText, errorText } = useI18n();
  const copy = t.moderation.actions;
  if (notice.kind === 'failed') return <Banner tone="danger" title={errorText(notice.code)} onDismiss={onDismiss} />;
  return (
    <Banner tone="success" title={formatText(copy.done[notice.action], { count: notice.resolution.count })} onDismiss={onDismiss} />
  );
}

// §12.4: the open groups the reader may see, oldest first. A Peer Moderator
// gets Post groups without reporters; an Admin gets both kinds, with them.
// What the reader may see is the server's decision alone; this only shows it.
export function ModerationQueue({ admin }: { admin: boolean }): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = t.moderation;
  const queue = useQuery(moderationQueueQueryOptions(admin));
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // The card that held focus may leave the queue, so the answer takes it.
  useEffect(() => {
    if (notice !== null) noticeRef.current?.focus();
  }, [notice]);

  // The notice's dismiss button goes with it, so focus moves to the queue.
  function dismissNotice(): void {
    setNotice(null);
    bodyRef.current?.focus();
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div ref={noticeRef} tabIndex={-1} className="rounded-lg focus-ring empty:hidden">
        {notice !== null ? <NoticeBanner notice={notice} onDismiss={dismissNotice} /> : null}
      </div>
      <div ref={bodyRef} tabIndex={-1} className="min-w-0 rounded-lg focus-ring">
        {queue.isError ? (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-sm text-ink-danger">{errorText(failureCode(queue.error))}</p>
            <Button variant="secondary" size="sm" onClick={() => void queue.refetch()}>
              {copy.retry}
            </Button>
          </div>
        ) : queue.data === undefined ? (
          <p role="status" aria-busy="true" className="text-sm text-ink-muted">
            {copy.loading}
          </p>
        ) : queue.data.items.length === 0 ? (
          <EmptyState
            icon={<FlagIcon />}
            title={copy.queue.emptyTitle}
            description={admin ? copy.queue.adminEmpty : copy.queue.peerEmpty}
          />
        ) : (
          <ul className="flex min-w-0 flex-col gap-4">
            {queue.data.items.map((group) => (
              <li key={targetKey(group.target)} className="min-w-0">
                <QueueGroupCard group={group} admin={admin} onDone={setNotice} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
