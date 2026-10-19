import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { endFriendship, friendsQueryOptions } from '../api/friends';
import type { StudentRef } from '../api/profile';
import { AlertIcon, Banner, Button, Card, EmptyState, UserIcon } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';
import { EndFriendshipDialog } from './EndFriendshipDialog';
import { OnlineStatus } from './OnlineStatus';

// What the status Banner says, kept as what happened rather than as a text,
// so it follows a language switch: whose Friendship ended, or a failure's
// code.
type Status = { kind: 'ended'; student: StudentRef } | { kind: 'failed'; code: unknown };

// §6.4, §7.6, §11.1: the signed-in Student's accepted Friends on `/friends`,
// each with their Presence, live from `presence:update`, and End Friendship.
// Nobody else sees this list (§4.6). The page reads it again when it opens,
// so a request the other Student accepted meanwhile shows.
export function FriendsCard(): React.JSX.Element {
  const { t, formatText, personNameValue, errorText } = useI18n();
  const actions = t.social.actions;
  const friendActions = t.social.friendActions;
  const copy = t.social.friendList;
  const queryClient = useQueryClient();
  const friends = useQuery({ ...friendsQueryOptions(), refetchOnMount: 'always' });
  // The Friend the confirm dialog is open for, and whether its End is in
  // flight. The dialog stays open until the End settles, so no other row can
  // be pressed meanwhile.
  const [confirming, setConfirming] = useState<StudentRef | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const statusRef = useRef<HTMLDivElement>(null);

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, since the ended row and its button are gone.
  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  // A Friendship ended elsewhere, by the other Student or a Block, can leave
  // the list while the dialog is open; the dialog then closes, since
  // confirming could only be refused.
  const confirmingListed =
    confirming !== null && (friends.data?.items.some((item) => item.student.id === confirming.id) ?? false);
  useEffect(() => {
    if (confirming !== null && !confirmingListed && !pending) setConfirming(null);
  }, [confirming, confirmingListed, pending]);

  async function onEnd(): Promise<void> {
    if (confirming === null || pending) return;
    const student = confirming;
    setPending(true);
    try {
      await endFriendship(queryClient, student.id);
      setStatus({ kind: 'ended', student });
    } catch (error) {
      setStatus({ kind: 'failed', code: failureCode(error) });
    } finally {
      setPending(false);
      setConfirming(null);
    }
  }

  let body: React.ReactNode;
  if (friends.data === undefined) {
    body = friends.isError ? (
      <EmptyState
        icon={<AlertIcon size={24} />}
        title={errorText(failureCode(friends.error))}
        action={
          <Button variant="secondary" onClick={() => void friends.refetch()}>
            {actions.retry}
          </Button>
        }
      />
    ) : (
      <p aria-busy="true" className="text-sm text-ink-muted">
        {copy.loading}
      </p>
    );
  } else if (friends.data.items.length === 0) {
    body = <EmptyState icon={<UserIcon size={24} />} title={copy.emptyTitle} description={copy.emptyDescription} />;
  } else {
    body = (
      <ul className="flex min-w-0 flex-col divide-y divide-line">
        {friends.data.items.map((friend) => {
          const name = personNameValue(friend.student.displayName, friend.student.removed);
          return (
            <li key={friend.student.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <StudentLink student={friend.student} />
                <div className="mt-0.5">
                  <OnlineStatus online={friend.online} />
                </div>
              </div>
              {/* The accessible name adds the Friend's name after the visible
              text. */}
              <Button
                variant="secondary"
                size="sm"
                aria-label={formatText(copy.endNamed, { name })}
                onClick={() => {
                  setStatus(undefined);
                  setConfirming(friend.student);
                }}
              >
                {friendActions.end}
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
                title={formatText(friendActions.ended, {
                  name: personNameValue(status.student.displayName, status.student.removed),
                })}
              />
            )}
          </div>
        ) : null}
        {body}
      </div>
      <EndFriendshipDialog
        student={confirming}
        pending={pending}
        onConfirm={() => void onEnd()}
        onClose={() => setConfirming(null)}
      />
    </Card>
  );
}
