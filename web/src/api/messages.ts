import { infiniteQueryOptions, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import type { StudentRef } from './profile';
import { apiFetch } from './client';
import { SESSION_QUERY_KEY, type SessionValue, writeAsSignedIn } from './session';
import { socket } from '../realtime/socket';

// §6.5 and §7.3's routes, with the exact wire shapes the API returns. The SPA
// defines its own view types rather than importing the server's: the shapes
// are the contract, not the server's file.

// One Direct Message, either direction. No `readAt` (§11.4): the API never
// tells the SPA when its own messages were read, and this same value is the
// `dm:message` payload.
export interface DirectMessageView {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
}

// One row of `/api/messages/threads`: the peer, the pair's last message in
// either direction, the unread count of messages to the viewer, and whether
// composing is available right now (no Block either way, peer not Removed).
export interface ThreadView {
  peer: StudentRef;
  lastMessage: DirectMessageView;
  unreadCount: number;
  canSend: boolean;
}

// 50 rows per page; `nextCursor` is §6.0.1's keyset cursor, null at the end.
export interface ThreadPage {
  items: ThreadView[];
  nextCursor: string | null;
}

// `GET /api/messages/threads/:peerId`: the peer, `canSend`, and one page of
// the pair's two directions interleaved, newest first.
export interface PeerThread {
  peer: StudentRef;
  canSend: boolean;
  items: DirectMessageView[];
  nextCursor: string | null;
}

// `POST /api/messages/threads/:peerId/read`'s result: `read_at` is private
// (§11.4), so only the count of rows the mark touched comes back.
export interface ThreadRead {
  updated: number;
}

export const MESSAGES_QUERY_KEY = ['messages'] as const;
export const THREADS_QUERY_KEY = [...MESSAGES_QUERY_KEY, 'threads'] as const;

export function peerThreadQueryKey(peerId: string): readonly [string, string, string] {
  return [...MESSAGES_QUERY_KEY, 'thread', peerId];
}

// The threads list and one peer's message page are both infinite queries,
// paged the same way: the cursor of the last page served, or none for the
// first.
type CursorPages = { pageParam?: string };

async function fetchThreadPage(page: CursorPages): Promise<ThreadPage> {
  const cursor = page.pageParam === undefined ? '' : `?cursor=${encodeURIComponent(page.pageParam)}`;
  return apiFetch<ThreadPage>(`/messages/threads${cursor}`);
}

// §6.5: `/messages` reads its rows again when it opens, so a peer the other
// Student's first Direct Message created shows as soon as it opens.
export function threadsQueryOptions() {
  return infiniteQueryOptions({
    queryKey: THREADS_QUERY_KEY,
    queryFn: fetchThreadPage,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}

async function fetchPeerThreadPage(peerId: string, page: CursorPages): Promise<PeerThread> {
  const cursor = page.pageParam === undefined ? '' : `?cursor=${encodeURIComponent(page.pageParam)}`;
  return apiFetch<PeerThread>(`/messages/threads/${encodeURIComponent(peerId)}${cursor}`);
}

export function peerThreadQueryOptions(peerId: string) {
  return infiniteQueryOptions({
    queryKey: peerThreadQueryKey(peerId),
    queryFn: (page) => fetchPeerThreadPage(peerId, page),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}

// `POST /api/messages/threads/:peerId/read` (§6.5). A Block with the peer or
// a Removed peer changes nothing; the mark is the actor's own inbox.
async function postThreadRead(peerId: string): Promise<ThreadRead> {
  return apiFetch<ThreadRead>(`/messages/threads/${encodeURIComponent(peerId)}/read`, {
    method: 'POST',
    body: {},
  });
}

// One tick per message applied to a pair's caches (§7.4): a `dm:message`
// event, or the composer's own apply of its ack — the sender sees this same
// value arrive in both. A mark of one peer's messages reads that peer's
// tick when its POST goes out, and `showThreadRead` zeroes the row only
// while the tick stands at it: a message touching the pair's caches while
// the mark is in flight may not be read on the server, and a zeroed count
// would hide it — the list reads again for what the server counts instead.
// The entries stay, small against the threads a tab would carry.
const threadTouchedCount = new Map<string, number>();

function touchThreadCaches(peerId: string): void {
  threadTouchedCount.set(peerId, (threadTouchedCount.get(peerId) ?? 0) + 1);
}

// Marks the peer's messages read and zeroes that peer's cached unread count.
// It is asked for by the page holding the peer's messages, in the effect
// that fires when its data changes, and by §7.4's reaction when an arrival
// could not be placed on the page's loaded pages: both want the pair read
// whatever window the page holds (§7.4). It reports whether the mark went
// out and was answered, so the page records what the mark covered only
// then: a mark that failed is not remembered as done, and the page retries
// it on the next change of its data. The answer updates the cache, so it
// goes through writeAsSignedIn (§4.6): one that reports after another
// Student signed in on this tab touches no cache. A failed mark stays
// silent — no banner on the messages being read — and the next read of the
// row restores the truth.
export async function markThreadRead(queryClient: QueryClient, peerId: string): Promise<boolean> {
  // The mark covers the messages the server held when the POST went out, so
  // what its answer may zero is the pair's caches as they stood then: the
  // tick read here is the one `showThreadRead` compares its answer against,
  // and beside it the threads list's last rewrite — the answer zeroes the
  // row only while neither has moved since the POST went out.
  const sentTouches = threadTouchedCount.get(peerId) ?? 0;
  const sentListUpdatedAt = queryClient.getQueryState(THREADS_QUERY_KEY)?.dataUpdatedAt;
  try {
    await writeAsSignedIn(
      queryClient,
      () => postThreadRead(peerId),
      async () => showThreadRead(queryClient, peerId, sentTouches, sentListUpdatedAt),
      () => undefined,
    );
    return true;
  } catch {
    // writeAsSignedIn rethrows a failure for a screen to show; this mark has
    // no screen of its own, so the rethrow only ends here, reported as a
    // mark the page may try again.
    return false;
  }
}

// The cached threads list's row for one peer, across the pages fetched so
// far, or undefined when none of them is theirs: a row may sit beyond the
// pages fetched up to now.
function threadRow(queryClient: QueryClient, peerId: string): ThreadView | undefined {
  const cached = queryClient.getQueryData<InfiniteData<ThreadPage>>(THREADS_QUERY_KEY);
  return cached?.pages.flatMap((page) => page.items).find((item) => item.peer.id === peerId);
}

// `POST …/read` succeeded, so the cached threads list's row for this peer is
// rewritten to nothing unread: the list is exact now, without another read.
// The row is zeroed only while nothing under the mark has moved since its
// POST went out: the pair's tick stands at what the POST read
// (`sentTouches`), the list's last rewrite still is the one the POST read
// (`sentListUpdatedAt`), and no read of the list runs. Anything else would
// put the answer's guess in the row: a tick between the two may or may not
// have been read by the server before the mark ran; a read of the list that
// answered while the mark was in flight took its counts from before the
// mark committed — a count it brings can be a message the mark never saw —
// and one still running holds such a snapshot of its own; a written zero
// would then show the answer's guess as the row's state and hide what the
// server counts as unread. For every one of those the list reads again
// instead, its read in flight cancelled: the fresh one answers from after
// the mark committed, with the counts the server holds now. A row the list
// does not hold zeroes nothing, so it reads again the same way: the row the
// list's next read carries must show the server's counts after the mark.
function showThreadRead(
  queryClient: QueryClient,
  peerId: string,
  sentTouches: number,
  sentListUpdatedAt: number | undefined,
): void {
  const row = threadRow(queryClient, peerId);
  if (
    row !== undefined &&
    (threadTouchedCount.get(peerId) ?? 0) === sentTouches &&
    queryClient.getQueryState(THREADS_QUERY_KEY)?.dataUpdatedAt === sentListUpdatedAt &&
    queryClient.isFetching({ queryKey: THREADS_QUERY_KEY }) === 0
  ) {
    updateThreadRows(queryClient, (rows) =>
      rows.map((one) => (one.peer.id === peerId ? { ...one, unreadCount: 0 } : one)),
    );
    return;
  }
  void readAgain(queryClient, THREADS_QUERY_KEY);
}

// The cached threads list, edited across the pages fetched so far. The edit
// runs over the flattened rows, and the result is split back up at the page
// sizes already served, so each page's cursor still names the row before its
// own first row (§6.0.1): a read with that cursor starts where the last one
// left off. An edit here only rewrites rows the list already holds; one that
// adds or removes rows is left to the next read of the list.
function updateThreadRows(
  queryClient: QueryClient,
  update: (rows: ThreadView[]) => ThreadView[],
): void {
  const data = queryClient.getQueryData<InfiniteData<ThreadPage>>(THREADS_QUERY_KEY);
  if (data === undefined) return;
  const sizes = data.pages.map((page) => page.items.length);
  const rows = update(data.pages.flatMap((page) => page.items));
  let start = 0;
  const pages = data.pages.map((page, index) => {
    const end = start + sizes[index];
    const items = rows.slice(start, end);
    start = end;
    return { items, nextCursor: page.nextCursor };
  });
  queryClient.setQueryData<InfiniteData<ThreadPage>>(THREADS_QUERY_KEY, {
    pages,
    pageParams: data.pageParams,
  });
}

// One of the messages queries reads again from this moment: the read in
// flight is cancelled first, and the fresh one starts after it, answering
// from the server as it stands now. invalidateQueries alone dedupes onto a
// read whose first answer has not landed yet and re-runs one only when the
// query already holds data, by its `cancelRefetch` default, so the
// cancellation is asked for before it — the same order rereadThread takes
// for the composer's re-reads.
async function readAgain(queryClient: QueryClient, queryKey: readonly unknown[]): Promise<void> {
  await queryClient.cancelQueries({ queryKey });
  await queryClient.invalidateQueries({ queryKey });
}

// Unread ids the row bump has counted, so the same message's count never
// rises twice: the sender's own send sees this same value arrive both in
// its ack and through `dm:message`, and an unrelated re-read arriving in
// between must not undo that either. The ids stay, small against the
// messages a tab would carry.
const seenUnread = new Set<string>();

// One message is newer than another when it was created after the other —
// not when it was reported first: `created_at` is set when the sending
// transaction starts, so two sends that overlap can commit, and be
// reported, in the opposite order of their creation. ISO `created_at`
// strings compare in place, and the ids settle the tie of two messages
// created in the same instant.
function isNewerMessage(one: DirectMessageView, other: DirectMessageView): boolean {
  return one.createdAt > other.createdAt || (one.createdAt === other.createdAt && one.id > other.id);
}

// One row of the list takes its peer's later-created message as the last
// one (§7.4). What arrives is compared with the last message the row's
// cached read already knew: one NEWER than it was created after everything
// that read counted, so it cannot stand in the row's unread count yet, and
// it is the row's change — to the viewer, and for a peer whose page is not
// open, the count rises by one, at most once (the `seenUnread` set), and
// never for the peer whose page is open: those messages are marked read the
// moment they land, so a count would show and drop again. One older than
// or equal to the cached last message — the latecomer the socket held while
// the list's re-read answered, say — stands in what that read counted
// already: the row's count and last message change on nothing, and the
// list reads again for what the server counts now. The rewritten row is
// set even while a read of the list is in flight; when one is, the list
// reads again after it — that read's answer was formed from the server
// before the message committed, so it would overwrite the rewritten row,
// while a fresh read answers from after the commit and carries it. A row
// the cache does not hold — the pair's first Direct Message arriving
// before the list was ever read, say — has nothing to change: the list
// reads again, and its refetch carries the new row.
function bumpThreadRow(
  queryClient: QueryClient,
  peerId: string,
  message: DirectMessageView,
  toViewer: boolean,
): void {
  const row = threadRow(queryClient, peerId);
  if (row === undefined) {
    void readAgain(queryClient, THREADS_QUERY_KEY);
    return;
  }
  if (row.lastMessage.id === message.id) return;
  // Not newer than the row's cached last message — the late ones the
  // held events bring after a settled read of the list, say — so what its
  // read counted stands, and the row is left as it is for the fresh read
  // to settle.
  if (!isNewerMessage(message, row.lastMessage)) {
    void readAgain(queryClient, THREADS_QUERY_KEY);
    return;
  }
  let unreadCount = row.unreadCount;
  if (toViewer && openThreadPeerId !== peerId && !seenUnread.has(message.id)) {
    unreadCount += 1;
    seenUnread.add(message.id);
  }
  // The message is the row's later-created last message now, taking the
  // count it raised with it.
  const bumped = { ...row, lastMessage: message, unreadCount };
  updateThreadRows(queryClient, (rows) => {
    // Back into the rows' own order: ahead of the first row whose last
    // message is older than this one's, or, when none is older, at the end.
    const rest = rows.filter((other) => other.peer.id !== peerId);
    const index = rest.findIndex((other) => isNewerMessage(bumped.lastMessage, other.lastMessage));
    if (index === -1) return [...rest, bumped];
    return [...rest.slice(0, index), bumped, ...rest.slice(index)];
  });
  if (queryClient.isFetching({ queryKey: THREADS_QUERY_KEY }) > 0) {
    void readAgain(queryClient, THREADS_QUERY_KEY);
  }
}

// The open page's cache takes this message at once (§7.4), in its sorted
// spot on the first page, which holds the messages newest first, and the
// answer says whether the pair's loaded pages hold it now: true when it was
// placed on one, or was already on one, false when the cache could not hold
// it and the pages read again instead. A message older than the first
// page's every item goes after that page's last item only when the pair's
// pages are all in the cache: when `nextCursor` says more pages exist, the
// read that fetches the next one runs past a cursor standing on the first
// page's last item and returns the message again, so building it into the
// first page would hold it twice — the page reads again instead, and the
// fresh pages answer from after the commit, holding the message once, in
// the page it belongs to. A page for another peer, or none open in the tab,
// is left alone.
function addToThreadCache(
  queryClient: QueryClient,
  peerId: string,
  message: DirectMessageView,
): boolean {
  const queryKey = peerThreadQueryKey(peerId);
  const data = queryClient.getQueryData<InfiniteData<PeerThread>>(queryKey);
  if (data === undefined) {
    // The page holds no messages yet — its first read still loading, or
    // none this tab has made at all — so the message can be added to
    // nothing. The read in flight took its snapshot from the server before
    // the message committed, so the page reads again here, and the fresh
    // read answers from after the commit and brings the message.
    void readAgain(queryClient, queryKey);
    return false;
  }
  for (const page of data.pages) {
    // Already on a loaded page: nothing to place, and the page's marking
    // effect has had the data that holds it.
    if (page.items.some((item) => item.id === message.id)) return true;
  }
  if (data.pages.length === 0) {
    // Not a state a read serves, but a cache holding no page takes no
    // insert: the fresh read brings the message instead.
    void readAgain(queryClient, queryKey);
    return false;
  }
  const first = data.pages[0];
  const index = first.items.findIndex((item) => isNewerMessage(message, item));
  if (index === -1 && first.nextCursor !== null) {
    // Older than the first page's every item, and more pages follow it: it
    // belongs on one of those pages, past the cursor this cache holds, and
    // the next page's read returns it there. Inserting it at the first
    // page's end would leave the pair's thread holding the message twice,
    // so the pages are read again instead — their fresh read answers from
    // after the commit and places the message on its own page, once. No
    // loaded page holds the message meanwhile.
    void readAgain(queryClient, queryKey);
    return false;
  }
  // Inserted at its sorted spot, not always at the front: a message
  // reported after a newer one sits under it. One older than everything
  // the first page holds goes to its end only now, when no next page
  // follows that end — nothing more will be read below it.
  const pages = data.pages.map((page, pageIndex) => {
    if (pageIndex !== 0) return page;
    const items =
      index === -1
        ? [...page.items, message]
        : [...page.items.slice(0, index), message, ...page.items.slice(index)];
    return { ...page, items };
  });
  queryClient.setQueryData<InfiniteData<PeerThread>>(queryKey, { pages, pageParams: data.pageParams });
  // While a read of the page is in flight, its answer was formed from the
  // server before the message committed, so it would overwrite this insert
  // with pages without the message: the page reads again here, and the
  // fresh read answers from after the commit. The insert stands meanwhile,
  // so the message still counts as placed.
  if (queryClient.isFetching({ queryKey }) > 0) {
    void readAgain(queryClient, queryKey);
  }
  return true;
}

// The peer whose messages are on screen now (§7.4). A row bump does not
// count them: the page marks its messages read the moment they land, so the
// count must not rise for messages the viewer is already looking at. The
// page itself registers and clears in an effect.
let openThreadPeerId: string | null = null;

export function registerOpenThread(peerId: string | null): void {
  openThreadPeerId = peerId;
}

function peerOf(viewerId: string, message: DirectMessageView): string | null {
  if (message.senderId === viewerId) return message.recipientId;
  if (message.recipientId === viewerId) return message.senderId;
  return null;
}

// §7.4's client reaction to `dm:message`: the open page's cache takes the
// message into its sorted spot when it can — a message older than the
// first page's every item while more pages follow has the pages read
// again instead, and no loaded page holds it until that read answers, so
// the page's own marking never sees it. The list's row takes the message
// as the pair's last message when it is the later-created one, the unread
// count of a message to the viewer rising by one at most. It never rises
// for the peer whose page is open: that page marks itself read as the
// message lands, so a count would rise and be zeroed at once. Applying
// the message ticks the pair first, so a mark's answer sent while this
// ran reads again instead of zeroing the row over it. Not the signed-in
// Student's messages at all, or one whose session is signed out, is
// ignored (§4.6).
export function applyDirectMessage(queryClient: QueryClient, message: DirectMessageView): void {
  const session = queryClient.getQueryData<SessionValue>(SESSION_QUERY_KEY);
  if (session?.authenticated !== true) return;
  const viewerId = session.student.id;
  const peerId = peerOf(viewerId, message);
  if (peerId === null) return;
  touchThreadCaches(peerId);
  const placed = addToThreadCache(queryClient, peerId, message);
  bumpThreadRow(queryClient, peerId, message, message.recipientId === viewerId);
  // A message no loaded page holds is invisible to the page's own marking,
  // which keys on the loaded pages: to the viewer, and with this peer's
  // page open, the mark is asked for here. The tick above is already in
  // what this mark captures, so its answer zeroes the row only over what
  // the server read with it.
  if (!placed && message.recipientId === viewerId && openThreadPeerId === peerId) {
    void markThreadRead(queryClient, peerId);
  }
}

// The composer's one send: `dm:send` over the socket, then the outcome
// applied to the caches. writeAsSignedIn (§4.6) reads the signed-in Student
// before the emission, so its check spans the request: a sign-in by another
// Student between the emission and the ack means the message belongs to the
// Student who sent it, and then no cache is touched. A sent outcome puts
// the message into the open page's cache in its sorted spot, where it is
// the newest on a normal send, and takes the list's row as its last
// message, unread counts untouched (§7.4); every other outcome applies
// nothing. The apply ticks the pair like a `dm:message` of the same value
// would, so a mark's answer in flight reads again instead of zeroing the
// row over it. The outcome comes back for the composer to show, whatever
// the session did in between.
export async function sendAndApply(
  queryClient: QueryClient,
  recipientId: string,
  body: string,
): Promise<DmSendOutcome> {
  let outcome: DmSendOutcome = { kind: 'noAnswer' };
  await writeAsSignedIn(
    queryClient,
    async () => {
      outcome = await sendDirectMessage(recipientId, body);
      return outcome;
    },
    async (result) => {
      if (result.kind !== 'sent') return;
      const session = queryClient.getQueryData<SessionValue>(SESSION_QUERY_KEY);
      if (session?.authenticated !== true) return;
      const peer = peerOf(session.student.id, result.message);
      if (peer === null) return;
      touchThreadCaches(peer);
      addToThreadCache(queryClient, peer, result.message);
      bumpThreadRow(queryClient, peer, result.message, false);
    },
    () => undefined,
  );
  return outcome;
}

// §7.3's send, over the socket with its ack as the answer. Without a live
// connection it is decided before anything is emitted; the ack arriving
// late is decided as unanswered — the message may have been saved.
const DM_SEND_TIMEOUT_MS = 10_000;

export type DmSendOutcome =
  | { kind: 'sent'; message: DirectMessageView }
  | { kind: 'refused'; code: string }
  | { kind: 'notConnected' }
  | { kind: 'noAnswer' };

export async function sendDirectMessage(recipientId: string, body: string): Promise<DmSendOutcome> {
  if (!socket.connected) return { kind: 'notConnected' };
  let ack: unknown;
  try {
    ack = await socket.timeout(DM_SEND_TIMEOUT_MS).emitWithAck('dm:send', { recipientId, body });
  } catch {
    return { kind: 'noAnswer' };
  }
  // The gateway's ack keeps the HTTP envelope's shape (§7.3), so it is read
  // with the same care: a malformed one is a failure, never a silent send.
  if (typeof ack === 'object' && ack !== null) {
    const envelope = ack as Record<string, unknown>;
    if (envelope.ok === true) return isDirectMessage(envelope.data)
      ? { kind: 'sent', message: envelope.data }
      : { kind: 'refused', code: 'internal_error' };
    if (envelope.ok === false && typeof envelope.error === 'object' && envelope.error !== null) {
      const error = envelope.error as Record<string, unknown>;
      if (typeof error.code === 'string') return { kind: 'refused', code: error.code };
    }
  }
  return { kind: 'refused', code: 'internal_error' };
}

// The wire shape of a Direct Message, read out of a `dm:message` payload;
// one of another shape is ignored by §7.4's reaction.
export function isDirectMessage(value: unknown): value is DirectMessageView {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as Record<string, unknown>;
  if (typeof message.id !== 'string' || typeof message.senderId !== 'string') return false;
  if (typeof message.recipientId !== 'string' || typeof message.body !== 'string') return false;
  return typeof message.createdAt === 'string' && !Number.isNaN(Date.parse(message.createdAt));
}

// Reads one peer's page again from now (§7.4): a mark that failed, or a send
// that never settled, may have changed on the server meanwhile. A read still
// in flight may have answered before that change, so it is cancelled first:
// its refetch would otherwise be handed the older answer.
export async function rereadThread(queryClient: QueryClient, peerId: string): Promise<void> {
  const queryKey = peerThreadQueryKey(peerId);
  await queryClient.cancelQueries({ queryKey });
  await queryClient.invalidateQueries({ queryKey });
}
