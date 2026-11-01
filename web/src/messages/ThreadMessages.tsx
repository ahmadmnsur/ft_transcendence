import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiProtocolError } from '../api/client';
import type { StudentRef } from '../api/profile';
import { markThreadRead, peerThreadQueryOptions } from '../api/messages';
import { sessionQueryOptions } from '../api/session';
import { AlertIcon, Avatar, Button, EmptyState, MessageIcon, PersonName, RoleLabel } from '../design';
import { useI18n } from '../i18n/context';
import { NotFoundPage, PageTitle } from '../layout';
import { failureCode } from '../profile/failure';
import { Composer } from './Composer';

const BOTTOM_SLACK_PX = 80;

export function ThreadMessages({ peerId }: { peerId: string }): React.JSX.Element {
  const { t, format, formatText, formatDateTime, personNameValue, errorText } = useI18n();
  const copy = t.messages.page;
  const queryClient = useQueryClient();
  const session = useQuery(sessionQueryOptions());
  const viewerId = session.data?.authenticated === true ? session.data.student.id : null;
  const page = useInfiniteQuery(peerThreadQueryOptions(peerId));

  const [markSettles, setMarkSettles] = useState(0);
  const coveredIncomingRef = useRef<ReadonlySet<string> | null>(null);
  const markInFlightRef = useRef(false);
  const changeWhileInFlightRef = useRef(false);
  useEffect(() => {
    if (viewerId === null) return;
    if (page.data === undefined) return;
    if (markInFlightRef.current) {
      changeWhileInFlightRef.current = true;
      return;
    }
    const covered = coveredIncomingRef.current;
    const incoming = page.data.pages
      .flatMap((one) => one.items)
      .filter((message) => message.recipientId === viewerId)
      .map((message) => message.id);
    if (covered !== null && incoming.every((id) => covered.has(id))) return;
    markInFlightRef.current = true;
    void markThreadRead(queryClient, peerId).then((marked) => {
      if (marked) {
        const nowCovered = new Set(coveredIncomingRef.current);
        for (const id of incoming) nowCovered.add(id);
        coveredIncomingRef.current = nowCovered;
      }
      markInFlightRef.current = false;
      if (changeWhileInFlightRef.current) {
        changeWhileInFlightRef.current = false;
        setMarkSettles((settles) => settles + 1);
      }
    });
  }, [markSettles, page.data, page.dataUpdatedAt, peerId, queryClient, viewerId]);

  const atBottomRef = useRef(true);
  useEffect(() => {
    function onScroll(): void {
      const distance = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      atBottomRef.current = distance < BOTTOM_SLACK_PX;
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const firstMessagesRef = useRef(true);
  useLayoutEffect(() => {
    const rendered = page.data?.pages.reduce((sum, one) => sum + one.items.length, 0) ?? 0;
    if (rendered === 0) return;
    if (firstMessagesRef.current || atBottomRef.current) {
      window.scrollTo({ top: document.documentElement.scrollHeight });
    }
    firstMessagesRef.current = false;
  }, [page.data]);

  if (page.isError && page.error instanceof ApiProtocolError && page.error.status === 404) {
    return <NotFoundPage />;
  }

  const loaded = page.data;
  const first = loaded?.pages[0];


  let body: React.ReactNode;
  if (loaded === undefined) {
    body = page.isError ? (
      <EmptyState
        icon={<AlertIcon size={24} />}
        title={errorText(failureCode(page.error))}
        action={
          <Button variant="secondary" onClick={() => void page.refetch()}>
            {t.social.actions.retry}
          </Button>
        }
      />
    ) : (
      <p aria-busy="true" className="text-sm text-ink-muted">
        {copy.loading}
      </p>
    );
  } else if (first !== undefined && first.items.length === 0) {
    body = (
      <EmptyState
        icon={<MessageIcon size={24} />}
        title={formatText(copy.emptyTitle, {
          name: personNameValue(first.peer.displayName, first.peer.removed),
        })}
        description={first.canSend ? copy.emptyDescription : undefined}
      />
    );
  } else {
    const shownIds = new Set<string>();
    const messages = loaded.pages
      .flatMap((one) => one.items)
      .filter((message) => {
        if (shownIds.has(message.id)) return false;
        shownIds.add(message.id);
        return true;
      })
      .reverse();
    body = (
      <>
        {page.hasNextPage ? (
          <div>
            <Button
              variant="secondary"
              loading={page.isFetchingNextPage}
              onClick={() => void page.fetchNextPage()}
            >
              {copy.showEarlier}
            </Button>
          </div>
        ) : null}
        <ol className="flex min-w-0 flex-col gap-2">
          {messages.map((message) => {
            const own = viewerId !== null && message.senderId === viewerId;
            return (
              <li key={message.id} className={`flex min-w-0 ${own ? 'justify-end' : 'justify-start'}`}>
                <div className="flex min-w-0 max-w-[85%] flex-col sm:max-w-[33rem]">
                  <p className="sr-only">
                    {own ? copy.ownSender : first === undefined ? null : (
                      <PersonName name={first.peer.displayName} removed={first.peer.removed} />
                    )}
                  </p>
                  <p
                    dir="auto"
                    className={`min-w-0 whitespace-pre-wrap break-words text-sm text-ink ${
                      own ? 'bg-surface-muted' : 'bg-surface'
                    } rounded-lg border border-line px-3 py-2`}
                  >
                    {message.body}
                  </p>
                  <p className={`mt-0.5 text-xs text-ink-subtle ${own ? 'text-end' : ''}`}>
                    {formatDateTime(new Date(message.createdAt))}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </>
    );
  }

  return (
    <>
      <PageTitle
        name={
          first === undefined
            ? t.messages.title
            : formatText(copy.heading, { name: personNameValue(first.peer.displayName, first.peer.removed) })
        }
      />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {first !== undefined ? (
          <header className="flex min-w-0 flex-wrap items-center gap-3">
            <Avatar src={first.peer.removed ? null : first.peer.avatarUrl} alt="" size="md" />
            <h1 className="min-w-0 flex-1 text-xl font-semibold text-ink wrap-anywhere">
              {format(copy.heading, { name: <ProfileHeading student={first.peer} /> })}
            </h1>
            {first.peer.isAdmin && !first.peer.removed ? <RoleLabel /> : null}
          </header>
        ) : (
          <h1 className="min-w-0 text-xl font-semibold text-ink">{t.messages.title}</h1>
        )}
        {body}
        {first !== undefined ? (
          first.canSend ? (
            <Composer peerId={peerId} />
          ) : (
            <p className="text-sm text-ink-muted">
              {first.peer.removed ? errorText('student_removed') : errorText('dm_unavailable')}
            </p>
          )
        ) : null}
      </div>
    </>
  );
}

function ProfileHeading({ student }: { student: StudentRef }): React.JSX.Element {
  return student.removed ? (
    <PersonName name={student.displayName} removed />
  ) : (
    <Link
      to="/students/$studentId"
      params={{ studentId: student.id }}
      className="rounded font-semibold text-link underline-offset-2 hover:underline focus-ring wrap-anywhere"
    >
      <PersonName name={student.displayName} removed={false} />
    </Link>
  );
}
