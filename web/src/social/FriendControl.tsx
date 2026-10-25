import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { blocksQueryOptions } from '../api/blocks';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  endFriendship,
  friendRequestsQueryOptions,
  friendsQueryOptions,
  sendFriendRequest,
} from '../api/friends';
import { studentQueryKey, type StudentRef } from '../api/profile';
import { sessionQueryOptions } from '../api/session';
import { Banner, Button } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { EndFriendshipDialog } from './EndFriendshipDialog';
import type { ControlParts } from './parts';

type Action = 'send' | 'accept' | 'decline' | 'cancel' | 'end';

// What the status Banner says, kept as what happened rather than as a text,
// so it follows a language switch: the action that succeeded, or the action
// that failed and its code.
type Status = { kind: 'done'; action: Action } | { kind: 'failed'; action: Action; code: unknown };

// §6.4, §11.1: the friend request button on another Student's profile, and
// what follows it: cancel a request sent, accept or decline one received, end
// a Friendship. It shows once the viewer's Friends, requests and Blocks have
// loaded, never on the viewer's own profile or a Removed Student's, and not
// while the viewer blocks the Student, whose Block control says so. A Block
// the other Student set is never shown: the request is refused with the same
// sentence whoever blocked (§6.4). The profile lays out its parts.
export function useFriendControl(student: StudentRef): ControlParts | null {
  const { t, formatText, personNameValue, errorText } = useI18n();
  const actions = t.social.actions;
  const friendActions = t.social.friendActions;
  const copy = t.social.friendProfile;
  const queryClient = useQueryClient();
  const { data: session } = useQuery(sessionQueryOptions());
  const friends = useQuery(friendsQueryOptions());
  const requests = useQuery(friendRequestsQueryOptions());
  const blocks = useQuery(blocksQueryOptions());
  const [pending, setPending] = useState<Action | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const statusRef = useRef<HTMLDivElement>(null);

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, since the button that was pressed is replaced.
  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  const isFriend = friends.data?.items.some((item) => item.student.id === student.id) ?? false;
  // A Friendship ended elsewhere, by the other Student or a Block, can reach
  // the list while the dialog is open; the dialog then closes, since
  // confirming could only be refused.
  useEffect(() => {
    if (!isFriend && pending === null) setConfirming(false);
  }, [isFriend, pending]);

  const viewerId = session?.authenticated === true ? session.student.id : null;
  if (viewerId === null || viewerId === student.id || student.removed) return null;

  const failed = [friends, requests, blocks].find((query) => query.data === undefined && query.isError);
  if (friends.data === undefined || requests.data === undefined || blocks.data === undefined) {
    if (failed === undefined) return null;
    return {
      status: (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-ink-danger">
            {errorText(failureCode(failed.error))}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              for (const query of [friends, requests, blocks]) if (query.isError) void query.refetch();
            }}
          >
            {actions.retry}
          </Button>
        </div>
      ),
      note: null,
      action: null,
      dialog: null,
    };
  }

  // A Block made here deleted any Friendship or request, and the Block
  // control's own Banner reports it, so nothing of this control stays.
  if (blocks.data.items.some((item) => item.student.id === student.id)) return null;

  const incoming = requests.data.incoming.find((request) => request.student.id === student.id);
  const outgoing = requests.data.outgoing.find((request) => request.student.id === student.id);
  const name = personNameValue(student.displayName, student.removed);

  // A refusal such as `student_removed` means the profile on screen is out
  // of date too, so it is read again beside the lists.
  async function run(action: Action, write: () => Promise<void>): Promise<void> {
    if (pending !== null) return;
    setPending(action);
    setStatus(undefined);
    try {
      await write();
      setStatus({ kind: 'done', action });
    } catch (error) {
      void queryClient.invalidateQueries({ queryKey: studentQueryKey(student.id) });
      setStatus({ kind: 'failed', action, code: failureCode(error) });
    } finally {
      setPending(null);
      setConfirming(false);
    }
  }

  // One button: while it is in flight its text names that state, and every
  // other button of the control is disabled.
  function actionButton(
    action: Action,
    variant: 'primary' | 'secondary',
    idle: string,
    busy: string,
    onPress: () => void,
  ): React.JSX.Element {
    const inFlight = pending === action;
    return (
      <Button
        variant={variant}
        size="sm"
        loading={inFlight}
        aria-disabled={pending !== null && !inFlight ? true : undefined}
        onClick={() => {
          if (pending === null) onPress();
        }}
      >
        {inFlight ? busy : idle}
      </Button>
    );
  }

  const doneText = {
    send: friendActions.sent,
    accept: friendActions.accepted,
    decline: friendActions.declined,
    cancel: friendActions.cancelled,
    end: friendActions.ended,
  };

  let noteText: string | null = null;
  let action: React.ReactNode;
  if (isFriend) {
    noteText = copy.friendsNote;
    action = actionButton('end', 'secondary', friendActions.end, friendActions.ending, () => {
      setStatus(undefined);
      setConfirming(true);
    });
  } else if (incoming !== undefined) {
    noteText = copy.incomingNote;
    action = (
      <div className="flex flex-wrap items-center gap-2">
        {actionButton('accept', 'primary', friendActions.accept, friendActions.accepting, () => {
          void run('accept', () => acceptFriendRequest(queryClient, incoming.id));
        })}
        {actionButton('decline', 'secondary', friendActions.decline, friendActions.declining, () => {
          void run('decline', () => declineFriendRequest(queryClient, incoming.id));
        })}
      </div>
    );
  } else if (outgoing !== undefined) {
    noteText = copy.outgoingNote;
    action = actionButton('cancel', 'secondary', friendActions.cancelRequest, friendActions.cancelling, () => {
      void run('cancel', () => cancelFriendRequest(queryClient, outgoing.id));
    });
  } else {
    action = actionButton('send', 'primary', friendActions.send, friendActions.sending, () => {
      void run('send', () => sendFriendRequest(queryClient, student.id));
    });
  }

  return {
    status:
      status === undefined ? null : (
        <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
          {status.kind === 'failed' ? (
            <Banner
              tone="danger"
              title={
                status.action === 'accept' && status.code === 'friend_request_unavailable'
                  ? friendActions.acceptUnavailable
                  : errorText(status.code)
              }
            />
          ) : (
            <Banner tone="success" title={formatText(doneText[status.action], { name })} />
          )}
        </div>
      ),
    note: noteText === null ? null : <p className="text-sm text-ink-muted">{noteText}</p>,
    action,
    dialog: (
      <EndFriendshipDialog
        student={confirming ? student : null}
        pending={pending === 'end'}
        onConfirm={() => void run('end', () => endFriendship(queryClient, student.id))}
        onClose={() => setConfirming(false)}
      />
    ),
  };
}
