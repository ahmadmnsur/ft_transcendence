import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  friendRequestsQueryOptions,
  type FriendRequestView,
} from '../api/friends';
import type { StudentRef } from '../api/profile';
import { AlertIcon, Banner, Button, Card, EmptyState } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';

type Action = 'accept' | 'decline' | 'cancel';

type Status =
  | { kind: 'done'; action: Action; student: StudentRef }
  | { kind: 'failed'; action: Action; code: unknown };

export function FriendRequestsCard(): React.JSX.Element {
  const { t, formatText, formatDate, personNameValue, errorText } = useI18n();
  const actions = t.social.actions;
  const friendActions = t.social.friendActions;
  const copy = t.social.requests;
  const friendFailureText = (action: Action, code: unknown): string =>
    action === 'accept' && code === 'friend_request_unavailable' ? friendActions.acceptUnavailable : errorText(code);
  const queryClient = useQueryClient();
  const requests = useQuery({ ...friendRequestsQueryOptions(), refetchOnMount: 'always' });
  const [pending, setPending] = useState<{ id: string; action: Action } | null>(null);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  async function answer(request: FriendRequestView, action: Action): Promise<void> {
    if (pending !== null) return;
    setPending({ id: request.id, action });
    setStatus(undefined);
    try {
      if (action === 'accept') await acceptFriendRequest(queryClient, request.id);
      else if (action === 'decline') await declineFriendRequest(queryClient, request.id);
      else await cancelFriendRequest(queryClient, request.id);
      setStatus({ kind: 'done', action, student: request.student });
    } catch (error) {
      setStatus({ kind: 'failed', action, code: failureCode(error) });
    } finally {
      setPending(null);
    }
  }

  function actionButton(request: FriendRequestView, action: Action): React.JSX.Element {
    const name = personNameValue(request.student.displayName, request.student.removed);
    const inFlight = pending?.id === request.id && pending.action === action;
    const label = {
      accept: { idle: friendActions.accept, busy: friendActions.accepting, named: copy.acceptNamed },
      decline: { idle: friendActions.decline, busy: friendActions.declining, named: copy.declineNamed },
      cancel: { idle: friendActions.cancelRequest, busy: friendActions.cancelling, named: copy.cancelNamed },
    }[action];
    return (
      <Button
        key={action}
        variant={action === 'accept' ? 'primary' : 'secondary'}
        size="sm"
        loading={inFlight}
        aria-disabled={pending !== null && !inFlight ? true : undefined}
        aria-label={inFlight ? undefined : formatText(label.named, { name })}
        onClick={() => void answer(request, action)}
      >
        {inFlight ? label.busy : label.idle}
      </Button>
    );
  }

  function section(
    title: string,
    items: FriendRequestView[],
    empty: string,
    dated: typeof copy.sentOn,
    buttons: Action[],
  ): React.JSX.Element {
    return (
      <section className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">{empty}</p>
        ) : (
          <ul className="flex min-w-0 flex-col divide-y divide-line">
            {items.map((request) => (
              <li key={request.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <StudentLink student={request.student} />
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {formatText(dated, { date: formatDate(new Date(request.createdAt)) })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {buttons.map((action) => actionButton(request, action))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  let body: React.ReactNode;
  if (requests.data === undefined) {
    body = requests.isError ? (
      <EmptyState
        icon={<AlertIcon size={24} />}
        title={errorText(failureCode(requests.error))}
        action={
          <Button variant="secondary" onClick={() => void requests.refetch()}>
            {actions.retry}
          </Button>
        }
      />
    ) : (
      <p aria-busy="true" className="text-sm text-ink-muted">
        {copy.loading}
      </p>
    );
  } else {
    body = (
      <>
        {section(copy.incomingTitle, requests.data.incoming, copy.incomingEmpty, copy.receivedOn, ['accept', 'decline'])}
        {section(copy.outgoingTitle, requests.data.outgoing, copy.outgoingEmpty, copy.sentOn, ['cancel'])}
      </>
    );
  }

  const doneText = { accept: friendActions.accepted, decline: friendActions.declined, cancel: friendActions.cancelled };

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      <div className="flex min-w-0 flex-col gap-4">
        {status !== undefined ? (
          <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
            {status.kind === 'failed' ? (
              <Banner tone="danger" title={friendFailureText(status.action, status.code)} />
            ) : (
              <Banner
                tone="success"
                title={formatText(doneText[status.action], {
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
