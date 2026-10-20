import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiProtocolError } from '../api/client';
import type { StudentRef } from '../api/profile';
import { markThreadRead, peerThreadQueryOptions, registerOpenThread } from '../api/messages';
import { sessionQueryOptions } from '../api/session';
import { AlertIcon, Avatar, Button, EmptyState, MessageIcon, PersonName, RoleLabel } from '../design';
import { useI18n } from '../i18n/context';
import { NotFoundPage, PageTitle } from '../layout';
import { failureCode } from '../profile/failure';
import { Composer } from './Composer';

// The distance from the bottom of the page under which the viewer counts as
// sitting on the newest message.
const BOTTOM_SLACK_PX = 80;

// §6.5, §7.3, §7.4: one peer's page at `/messages/$peerId`. The pair's
// messages run from the earliest to the newest, read from the server in
// pages going back; the composer sends over §7.3's `dm:send`, and the page
// marks itself read whenever an incoming message its loaded pages hold is
// not covered by the pair's last mark (§11.4: `read_at` is private, so the
// only thing its own marking may ever do is zero its own counts). A Removed
// Student's page shows the tombstone and no way to write, and a Block
// standing between the pair closes the page the same way.
export function ThreadMessages({ peerId }: { peerId: string }): React.JSX.Element {
  const { t, format, formatText, formatDateTime, personNameText, personNameValue, errorText } = useI18n();
  const copy = t.messages.page;
  const queryClient = useQueryClient();
  const session = useQuery(sessionQueryOptions());
  const viewerId = session.data?.authenticated === true ? session.data.student.id : null;
  const page = useInfiniteQuery(peerThreadQueryOptions(peerId));

  // While this peer's page is on screen, §7.4's `dm:message` for them
  // settles by being marked read rather than counted, in the effect below.
  // Registering is all this effect does: the mark keys on the messages the
  // data holds, so a page marks itself once its data is in, not a second
  // time here alongside it.
  useEffect(() => {
    registerOpenThread(peerId);
    return () => registerOpenThread(null);
  }, [peerId]);

  // The page's marks, keyed on what the loaded pages hold. The first runs
  // once the data is in, whether or not that data holds a message to the
  // viewer — one older than the first pages may still be unread, and the
  // mark covers the pair, not the window the data fetched — and the next
  // runs whenever a message to the viewer the pair's last mark did not
  // cover is in the loaded pages: a message that lands in the open page as
  // the reaction's event (§7.4), and the ones the shell's refetch after a
  // reconnect (§7.5) brings from while the socket was down.
  //
  // The key is the set of incoming ids, not the newest one: `created_at` is
  // set when a sending transaction starts, so an older message can be
  // reported after a newer one, and then the newest id still names the same
  // message while the latecomer sits unmarked. The ref holds the incoming
  // ids the last successful mark covered — `null` until a mark has
  // succeeded — so a page whose loaded messages hold nothing to the viewer
  // still marks once, and every mark after the first is asked for by an id
  // that mark was never sent with. A mark that failed changes that ref on
  // nothing, and `dataUpdatedAt` is in the dependencies beside `data` for
  // it: a read that answers with the same messages keeps the same `data`,
  // so only its fresh timestamp asks this effect to send the mark again.
  //
  // At most one mark is in flight: a change of the data while one runs
  // skips the effect, and the skip is remembered in a ref. The mark's
  // settle — answered or failed — clears that ref and asks the effect once
  // more, so the ids that arrived in flight are read whatever the settle
  // was. A failure with no change skipped during it asks for nothing, so
  // a failing mark waits for the next change instead of retrying itself.
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
        // The mark covers the ids the pages held when it was sent, and
        // the ids the marks before it covered stay covered.
        const nowCovered = new Set(coveredIncomingRef.current);
        for (const id of incoming) nowCovered.add(id);
        coveredIncomingRef.current = nowCovered;
      }
      markInFlightRef.current = false;
      // A change skipped while the mark was in flight is checked now,
      // whatever the answer was: a success goes after the ids it skipped
      // over, a failure sends this same mark again. With no change
      // skipped, a failure checks nothing and waits for the next one.
      if (changeWhileInFlightRef.current) {
        changeWhileInFlightRef.current = false;
        setMarkSettles((settles) => settles + 1);
      }
    });
  }, [markSettles, page.data, page.dataUpdatedAt, peerId, queryClient, viewerId]);

  // Whether the viewer sits on the newest message, watched on the window's
  // scroll: an unread message arriving in an open page is marked and shown
  // right away, and the page follows as long as the viewer kept the newest
  // on screen.
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

  // The first messages land at the newest, as the page opens onto; later
  // additions follow only while the viewer already sat at the end, so
  // reading an earlier page is never yanked away from.
  const firstMessagesRef = useRef(true);
  useLayoutEffect(() => {
    const rendered = page.data?.pages.reduce((sum, one) => sum + one.items.length, 0) ?? 0;
    if (rendered === 0) return;
    if (firstMessagesRef.current || atBottomRef.current) {
      window.scrollTo({ top: document.documentElement.scrollHeight });
    }
    firstMessagesRef.current = false;
  }, [page.data]);

  // A profile that is gone is the route's not-found page, decided without
  // showing the thread (§6.5); any other failure is its own sentence.
  if (page.isError && page.error instanceof ApiProtocolError && page.error.status === 404) {
    return <NotFoundPage />;
  }

  const loaded = page.data;
  const first = loaded?.pages[0];

  // The name a received message shows for its sender, in the sr-only line
  // ahead of its body: the peer's name, the tombstone for a Removed one.
  // The viewer's own messages say "You" instead.
  const receivedSender = first === undefined ? '' : personNameText(first.peer.displayName, first.peer.removed);

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
    // Pages are stored newest first, so the display runs them back: the
    // earliest on top, the newest at the bottom, where the composer sits.
    // A message can still sit in the cache twice — the late one and the
    // read it came with can end up on different pages — so the ids are
    // deduped as a guard, the first occurrence kept, and no two list items
    // share a key.
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
                  {/* The sender in text ahead of the body: the alignment and
                  the background colour say it to a sighted viewer only, so a
                  screen reader gets the words, and the time after reads as
                  before. */}
                  <p className="sr-only">{own ? copy.ownSender : receivedSender}</p>
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

// The heading's name, on its own for the page's heading to hold: a Student
// whose profile still exists carries the link to it, and a Removed one's
// tombstone links to nothing (§4.6).
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
