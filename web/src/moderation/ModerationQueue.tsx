import { useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { POST_GROUP_ACTIONS, STUDENT_GROUP_ACTIONS, type PostGroupAction, type StudentGroupAction } from '@shared/reports';
import {
  moderationQueueQueryOptions,
  resolveGroup,
  targetKey,
  type GroupAction,
  type GroupTarget,
  type QueueGroup,
  type Resolution,
} from '../api/moderation';
import { AlertIcon, Banner, Button, Card, EmptyState, FlagIcon, Modal } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { useRetainedItems } from '../shell/useRetainedItems';
import { MetaLine, OpenInUsers, ReportedTarget, ReportRows, TargetHeading } from './ReportedTarget';

type Notice =
  | { kind: 'resolved'; action: GroupAction; resolution: Resolution; target: GroupTarget }
  | { kind: 'failed'; code: unknown; target: GroupTarget; count: number };

function QueueGroupCard({
  group,
  admin,
  onDone,
  onConfirmChange,
}: {
  group: QueueGroup;
  admin: boolean;
  onDone: (notice: Notice) => void;
  onConfirmChange: (open: boolean) => void;
}): React.JSX.Element {
  const { t, formatText, personNameValue } = useI18n();
  const copy = t.moderation;
  const queryClient = useQueryClient();
  const actions: readonly GroupAction[] = group.target.kind === 'POST' ? POST_GROUP_ACTIONS : STUDENT_GROUP_ACTIONS;
  const [confirming, setConfirming] = useState(false);
  const [chosen, setChosen] = useState<GroupAction>('DISMISS');
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const { target, count } = group;
  const person = target.kind === 'STUDENT' ? target.student : target.post.author;
  const name = personNameValue(person.displayName, person.removed);

  function confirm(open: boolean): void {
    setConfirming(open);
    onConfirmChange(open);
  }

  function description(action: GroupAction): string {
    return target.kind === 'POST'
      ? formatText(copy.actions.confirmBody.post[action as PostGroupAction], { count, name })
      : formatText(copy.actions.confirmBody.student[action as StudentGroupAction], { count, name });
  }

  function confirmTitle(action: GroupAction): string {
    const titles = copy.actions.confirmTitle;
    if (target.kind === 'STUDENT') return formatText(titles.student[action as StudentGroupAction], { count, name });
    return action === 'REMOVE_POST' ? formatText(titles.post.REMOVE_POST, { name }) : formatText(titles.post.DISMISS, { count, name });
  }

  async function resolve(action: GroupAction): Promise<void> {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    let resolution: Resolution | null;
    try {
      resolution = await resolveGroup(queryClient, target, action);
    } catch (error) {
      confirm(false);
      onDone({ kind: 'failed', code: failureCode(error), target, count });
      return;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
    if (resolution === null) return;
    confirm(false);
    onDone({ kind: 'resolved', action, resolution, target });
  }

  return (
    <Card
      headingLevel={2}
      title={<TargetHeading target={target} id={headingId} />}
      subtitle={
        <MetaLine>
          <span>{target.kind === 'POST' ? copy.queue.postGroup : copy.queue.studentGroup}</span>
          <span>{formatText(copy.queue.reportCount, { count })}</span>
        </MetaLine>
      }
      actions={
        admin ? (
          <OpenInUsers studentId={person.id} name={target.kind === 'POST' ? name : undefined} describedBy={headingId} />
        ) : undefined
      }
    >
      <div className="flex min-w-0 flex-col gap-4">
        {target.kind === 'POST' ? <ReportedTarget post={target.post} /> : null}
        <ReportRows reports={group.reports} />
        {!admin && group.filedByMe ? (
          <p className="text-sm text-ink-muted">{copy.queue.filedByMe}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action}
                size="sm"
                variant={action === 'REMOVE_POST' ? 'danger-secondary' : 'secondary'}
                aria-haspopup="dialog"
                aria-describedby={headingId}
                onClick={() => {
                  setChosen(action);
                  confirm(true);
                }}
              >
                {copy.actions.label[action]}
              </Button>
            ))}
          </div>
        )}
      </div>
      <Modal
        open={confirming}
        size="sm"
        title={confirmTitle(chosen)}
        description={description(chosen)}
        initialFocusRef={cancelRef}
        onClose={() => {
          if (!pendingRef.current) confirm(false);
        }}
        footer={
          <>
            <Button ref={cancelRef} variant="secondary" disabled={pending} onClick={() => confirm(false)}>
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
      >
        {target.kind === 'POST' ? (
          <p
            dir="auto"
            className="line-clamp-3 whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2.5 text-sm text-ink wrap-anywhere text-match-parent"
          >
            {target.post.body}
          </p>
        ) : null}
      </Modal>
    </Card>
  );
}

function NoticeBanner({ notice, admin, onDismiss }: { notice: Notice; admin: boolean; onDismiss: () => void }): React.JSX.Element {
  const { t, formatText, errorText, personNameValue } = useI18n();
  const copy = t.moderation.actions;
  const { target } = notice;
  const person = target.kind === 'STUDENT' ? target.student : target.post.author;
  const name = personNameValue(person.displayName, person.removed);
  if (notice.kind === 'failed') {
    const raced = notice.code === 'already_resolved';
    const message = !raced
      ? errorText(notice.code)
      : formatText(target.kind === 'POST' ? copy.alreadyResolved.post : copy.alreadyResolved.student, { count: notice.count, name });
    return <Banner tone="danger" title={message} onDismiss={onDismiss} />;
  }
  const { action } = notice;
  const count = notice.resolution.count;
  const title =
    target.kind === 'POST'
      ? formatText(copy.done.post[action as PostGroupAction], { count, name })
      : formatText(copy.done.student[action as StudentGroupAction], { count, name });
  const sanction =
    admin && target.kind === 'STUDENT' && action === 'ACTION' ? (
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span>{copy.noSanction}</span>
        <OpenInUsers studentId={target.student.id} />
      </span>
    ) : undefined;
  return <Banner tone="success" title={title} body={sanction} onDismiss={onDismiss} />;
}

export function ModerationQueue({ admin }: { admin: boolean }): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = t.moderation;
  const queue = useQuery(moderationQueueQueryOptions(admin));
  const { items: groups, retain, retaining } = useRetainedItems(queue.data?.items ?? [], (group) => targetKey(group.target));
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (notice !== null) noticeRef.current?.focus();
  }, [notice]);

  function dismissNotice(): void {
    setNotice(null);
    bodyRef.current?.focus();
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div ref={noticeRef} tabIndex={-1} className="rounded-lg focus-ring empty:hidden">
        {notice !== null ? <NoticeBanner notice={notice} admin={admin} onDismiss={dismissNotice} /> : null}
      </div>
      <div ref={bodyRef} tabIndex={-1} className="min-w-0 rounded-lg focus-ring">
        {queue.isError && !retaining ? (
          <div role="alert">
            <EmptyState
              icon={<AlertIcon size={24} />}
              title={errorText(failureCode(queue.error))}
              action={
                <Button variant="secondary" onClick={() => void queue.refetch()}>
                  {copy.retry}
                </Button>
              }
            />
          </div>
        ) : queue.data === undefined && !retaining ? (
          <p role="status" aria-busy="true" className="text-sm text-ink-muted">
            {copy.loading}
          </p>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<FlagIcon size={24} />}
            title={copy.queue.emptyTitle}
            description={admin ? copy.queue.adminEmpty : copy.queue.peerEmpty}
          />
        ) : (
          <ul className="flex min-w-0 flex-col gap-4">
            {groups.map((group) => (
              <li key={targetKey(group.target)} className="min-w-0">
                <QueueGroupCard group={group} admin={admin} onDone={setNotice} onConfirmChange={(open) => {
                  retain(group, open);
                  if (!open && !queue.data?.items.some((item) => targetKey(item.target) === targetKey(group.target))) {
                    requestAnimationFrame(() => {
                      if (document.activeElement === document.body) bodyRef.current?.focus();
                    });
                  }
                }} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
