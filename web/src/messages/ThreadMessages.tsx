import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiProtocolError } from '../api/client';
import { friendsQueryOptions } from '../api/friends';
import type { StudentRef } from '../api/profile';
import { isDirectMessage, markThreadRead, peerThreadQueryOptions, type DirectMessageView } from '../api/messages';
import { sessionQueryOptions } from '../api/session';
import { AlertIcon, Avatar, Banner, Button, ChevronLeftIcon, EmptyState, MessageIcon, PersonName, RoleLabel } from '../design';
import { useI18n } from '../i18n/context';
import { NotFoundPage, PageTitle } from '../layout';
import { failureCode } from '../profile/failure';
import { subscribe } from '../realtime/socket';
import { OnlineStatus } from '../social/OnlineStatus';
import { Composer } from './Composer';

const RUN_GAP_MS = 5 * 60_000;
const ANNOUNCED_CHARS = 140;

interface MessageDay {
  key: string;
  date: Date;
  messages: DirectMessageView[];
}

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function byDay(messages: readonly DirectMessageView[]): MessageDay[] {
  const days: MessageDay[] = [];
  for (const message of messages) {
    const date = new Date(message.createdAt);
    const key = dayKey(date);
    const last = days.at(-1);
    if (last !== undefined && last.key === key) last.messages.push(message);
    else days.push({ key, date, messages: [message] });
  }
  return days;
}

function sameRun(earlier: DirectMessageView | undefined, later: DirectMessageView | undefined): boolean {
  if (earlier === undefined || later === undefined) return false;
  if (earlier.senderId !== later.senderId) return false;
  return Date.parse(later.createdAt) - Date.parse(earlier.createdAt) < RUN_GAP_MS;
}

function useIncomingMessage(peerId: string): { id: string; body: string } | null {
  const [incoming, setIncoming] = useState<{ id: string; body: string } | null>(null);
  useEffect(
    () =>
      subscribe('dm:message', (payload) => {
        if (!isDirectMessage(payload) || payload.senderId !== peerId) return;
        const text = Array.from(payload.body);
        const body = text.length > ANNOUNCED_CHARS ? `${text.slice(0, ANNOUNCED_CHARS).join('')}…` : payload.body;
        setIncoming({ id: payload.id, body });
      }),
    [peerId],
  );
  return incoming;
}

const BOTTOM_SLACK_PX = 80;

export function ThreadMessages({ peerId }: { peerId: string }): React.JSX.Element {
  const { t, format, formatText, formatDate, formatTime, personNameValue, errorText } = useI18n();
  const copy = t.messages.page;
  const queryClient = useQueryClient();
  const session = useQuery(sessionQueryOptions());
  const viewerId = session.data?.authenticated === true ? session.data.student.id : null;
  const page = useInfiniteQuery(peerThreadQueryOptions(peerId));
  const friends = useQuery({ ...friendsQueryOptions(), enabled: viewerId !== null });
  const friend = friends.data?.items.find((item) => item.student.id === peerId);
  const incoming = useIncomingMessage(peerId);
  const [unseen, setUnseen] = useState(false);
  const [focusEarliest, setFocusEarliest] = useState(false);
  const daysRef = useRef<HTMLDivElement>(null);

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
      if (atBottomRef.current) setUnseen(false);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(
    () =>
      subscribe('dm:message', (payload) => {
        if (isDirectMessage(payload) && payload.senderId === peerId && !atBottomRef.current) setUnseen(true);
      }),
    [peerId],
  );

  useEffect(() => {
    if (!focusEarliest || page.hasNextPage || page.isFetchingNextPage) return;
    setFocusEarliest(false);
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    daysRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }, [focusEarliest, page.data, page.hasNextPage, page.isFetchingNextPage]);

  function showNewest(): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
    setUnseen(false);
  }

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
        title={formatText(first.canSend ? copy.emptyTitle : copy.closedTitle, {
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
          <div className="flex flex-col items-start gap-1">
            <Button
              variant="secondary"
              loading={page.isFetchingNextPage}
              onClick={() => {
                void page.fetchNextPage().then((result) => {
                  if (!result.isError && !result.hasNextPage) setFocusEarliest(true);
                });
              }}
              className="scroll-mt-28"
            >
              {copy.showEarlier}
            </Button>
            {page.isFetchNextPageError ? (
              <p role="alert" className="text-xs font-medium text-ink-danger">
                {errorText(failureCode(page.error))}
              </p>
            ) : null}
          </div>
        ) : null}
        <div ref={daysRef} className="flex min-w-0 flex-col gap-6">
          {byDay(messages).map((day) => (
            <div key={day.key} className="flex min-w-0 flex-col gap-3">
              <h2
                tabIndex={-1}
                className="flex items-center gap-3 text-xs font-medium text-ink-muted outline-none before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line"
              >
                <time dateTime={day.key}>{formatDate(day.date)}</time>
              </h2>
              <ol className="flex min-w-0 flex-col">
                {day.messages.map((message, index) => {
                  const own = viewerId !== null && message.senderId === viewerId;
                  const continues = sameRun(day.messages[index - 1], message);
                  const runEnds = !sameRun(message, day.messages[index + 1]);
                  const sentAt = new Date(message.createdAt);
                  return (
                    <li
                      key={message.id}
                      className={`flex min-w-0 ${own ? 'justify-end' : 'justify-start'} ${
                        index === 0 ? '' : continues ? 'mt-1' : 'mt-4'
                      }`}
                    >
                      <div className={`flex min-w-0 max-w-[85%] flex-col sm:max-w-[33rem] ${own ? 'items-end' : 'items-start'}`}>
                        <p className="sr-only">
                          {own ? copy.ownSender : first === undefined ? null : (
                            <PersonName name={first.peer.displayName} removed={first.peer.removed} />
                          )}
                        </p>
                        <p
                          dir="auto"
                          className={`min-w-0 max-w-full whitespace-pre-wrap break-words text-base text-ink ${
                            own ? 'bg-surface-muted' : 'bg-surface'
                          } rounded-lg border border-line px-3 py-2`}
                        >
                          {message.body}
                        </p>
                        <p className={runEnds ? 'mt-1 text-xs text-ink-muted' : 'sr-only'}>
                          <time dateTime={message.createdAt}>{formatTime(sentAt)}</time>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
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
      <div className="mx-auto flex min-h-[calc(100dvh-var(--header-height,0px)-2rem)] w-full max-w-2xl flex-col gap-6">
        {first !== undefined ? (
          <header className="sticky top-(--header-height) z-30 -mx-4 flex min-w-0 items-center gap-3 border-b border-line bg-canvas px-4 py-3 [@media(max-height:32rem)]:static">
            <Link
              to="/messages"
              title={copy.back}
              aria-label={copy.back}
              className="relative -ms-2 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink focus-ring motion-reduce:transition-none pointer-coarse:before:absolute pointer-coarse:before:-inset-0.5"
            >
              <ChevronLeftIcon size={20} />
            </Link>
            <Avatar src={first.peer.removed ? null : first.peer.avatarUrl} alt="" size="md" />
            <div className="flex min-w-0 flex-1 flex-col">
              <h1 className="min-w-0 text-lg font-semibold text-ink wrap-anywhere sm:text-2xl">
                {format(copy.heading, { name: <ProfileHeading student={first.peer} /> })}
              </h1>
              {friend !== undefined && first.canSend ? <OnlineStatus online={friend.online} /> : null}
            </div>
            {first.peer.isAdmin && !first.peer.removed ? <RoleLabel /> : null}
          </header>
        ) : (
          <h1 className="min-w-0 text-lg font-semibold text-ink sm:text-2xl">{t.messages.title}</h1>
        )}
        {body}
        <p role="status" className="sr-only">
          {incoming !== null && first !== undefined ? (
            <span key={incoming.id}>
              {formatText(copy.incoming, {
                name: personNameValue(first.peer.displayName, first.peer.removed),
                body: incoming.body,
              })}
            </span>
          ) : null}
        </p>
        {first !== undefined ? (
          first.canSend ? (
            <Composer
              peerId={peerId}
              peerName={personNameValue(first.peer.displayName, first.peer.removed)}
              newMessage={unseen}
              onShowNewest={showNewest}
            />
          ) : (
            <Banner
              tone="info"
              title={first.peer.removed ? errorText('student_removed') : errorText('dm_unavailable')}
              className="mt-auto"
            />
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
      className="relative z-[1] inline-block max-w-full rounded font-semibold text-link underline-offset-2 hover:underline focus-ring wrap-anywhere pointer-coarse:before:absolute pointer-coarse:before:-inset-x-1 pointer-coarse:before:-inset-y-2.5"
    >
      <PersonName name={student.displayName} removed={false} />
    </Link>
  );
}
