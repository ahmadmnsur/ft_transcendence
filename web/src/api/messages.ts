import { infiniteQueryOptions, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import type { StudentRef } from './profile';
import { apiFetch, notifyUnauthorized } from './client';
import { SESSION_QUERY_KEY, type SessionValue, writeAsSignedIn } from './session';
import { socket } from '../realtime/socket';

export interface DirectMessageView {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
}

export interface ThreadView {
  peer: StudentRef;
  lastMessage: DirectMessageView;
  unreadCount: number;
  canSend: boolean;
}

export interface ThreadPage {
  items: ThreadView[];
  nextCursor: string | null;
}

export interface PeerThread {
  peer: StudentRef;
  canSend: boolean;
  items: DirectMessageView[];
  nextCursor: string | null;
}

export interface ThreadRead {
  updated: number;
}

export const MESSAGES_QUERY_KEY = ['messages'] as const;
export const THREADS_QUERY_KEY = [...MESSAGES_QUERY_KEY, 'threads'] as const;

export function peerThreadQueryKey(peerId: string): readonly [string, string, string] {
  return [...MESSAGES_QUERY_KEY, 'thread', peerId];
}

type CursorPages = { pageParam?: string };

async function fetchThreadPage(page: CursorPages): Promise<ThreadPage> {
  const cursor = page.pageParam === undefined ? '' : `?cursor=${encodeURIComponent(page.pageParam)}`;
  return apiFetch<ThreadPage>(`/messages/threads${cursor}`);
}

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

async function postThreadRead(peerId: string): Promise<ThreadRead> {
  return apiFetch<ThreadRead>(`/messages/threads/${encodeURIComponent(peerId)}/read`, {
    method: 'POST',
    body: {},
  });
}

type ThreadSync = { touches: number; countedIds: readonly string[] };

function threadSyncKey(peerId: string) {
  return [...MESSAGES_QUERY_KEY, 'sync', peerId] as const;
}

function threadSync(queryClient: QueryClient, peerId: string): ThreadSync {
  return queryClient.getQueryData<ThreadSync>(threadSyncKey(peerId)) ?? { touches: 0, countedIds: [] };
}

function touchThreadCaches(queryClient: QueryClient, peerId: string): void {
  const current = threadSync(queryClient, peerId);
  queryClient.setQueryData(threadSyncKey(peerId), { ...current, touches: current.touches + 1 });
}

export async function markThreadRead(queryClient: QueryClient, peerId: string): Promise<boolean> {
  const sentTouches = threadSync(queryClient, peerId).touches;
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
    return false;
  }
}

function threadRow(queryClient: QueryClient, peerId: string): ThreadView | undefined {
  const cached = queryClient.getQueryData<InfiniteData<ThreadPage>>(THREADS_QUERY_KEY);
  return cached?.pages.flatMap((page) => page.items).find((item) => item.peer.id === peerId);
}

function showThreadRead(
  queryClient: QueryClient,
  peerId: string,
  sentTouches: number,
  sentListUpdatedAt: number | undefined,
): void {
  const row = threadRow(queryClient, peerId);
  if (
    row !== undefined &&
    threadSync(queryClient, peerId).touches === sentTouches &&
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

async function readAgain(queryClient: QueryClient, queryKey: readonly unknown[]): Promise<void> {
  await queryClient.cancelQueries({ queryKey });
  await queryClient.invalidateQueries({ queryKey });
}

function isNewerMessage(one: DirectMessageView, other: DirectMessageView): boolean {
  return one.createdAt > other.createdAt || (one.createdAt === other.createdAt && one.id > other.id);
}

function bumpThreadRow(
  queryClient: QueryClient,
  peerId: string,
  message: DirectMessageView,
  toViewer: boolean,
  openPeerId: string | null = null,
): void {
  const row = threadRow(queryClient, peerId);
  if (row === undefined) {
    void readAgain(queryClient, THREADS_QUERY_KEY);
    return;
  }
  if (row.lastMessage.id === message.id) return;
  if (!isNewerMessage(message, row.lastMessage)) {
    void readAgain(queryClient, THREADS_QUERY_KEY);
    return;
  }
  let unreadCount = row.unreadCount;
  const sync = threadSync(queryClient, peerId);
  if (toViewer && openPeerId !== peerId && !sync.countedIds.includes(message.id)) {
    unreadCount += 1;
    queryClient.setQueryData(threadSyncKey(peerId), { ...sync, countedIds: [...sync.countedIds, message.id] });
  }
  const bumped = { ...row, lastMessage: message, unreadCount };
  updateThreadRows(queryClient, (rows) => {
    const rest = rows.filter((other) => other.peer.id !== peerId);
    const index = rest.findIndex((other) => isNewerMessage(bumped.lastMessage, other.lastMessage));
    if (index === -1) return [...rest, bumped];
    return [...rest.slice(0, index), bumped, ...rest.slice(index)];
  });
  if (queryClient.isFetching({ queryKey: THREADS_QUERY_KEY }) > 0) {
    void readAgain(queryClient, THREADS_QUERY_KEY);
  }
}

function addToThreadCache(
  queryClient: QueryClient,
  peerId: string,
  message: DirectMessageView,
): boolean {
  const queryKey = peerThreadQueryKey(peerId);
  const data = queryClient.getQueryData<InfiniteData<PeerThread>>(queryKey);
  if (data === undefined) {
    void readAgain(queryClient, queryKey);
    return false;
  }
  for (const page of data.pages) {
    if (page.items.some((item) => item.id === message.id)) return true;
  }
  if (data.pages.length === 0) {
    void readAgain(queryClient, queryKey);
    return false;
  }
  const first = data.pages[0];
  const index = first.items.findIndex((item) => isNewerMessage(message, item));
  if (index === -1 && first.nextCursor !== null) {
    void readAgain(queryClient, queryKey);
    return false;
  }
  const pages = data.pages.map((page, pageIndex) => {
    if (pageIndex !== 0) return page;
    const items =
      index === -1
        ? [...page.items, message]
        : [...page.items.slice(0, index), message, ...page.items.slice(index)];
    return { ...page, items };
  });
  queryClient.setQueryData<InfiniteData<PeerThread>>(queryKey, { pages, pageParams: data.pageParams });
  if (queryClient.isFetching({ queryKey }) > 0) {
    void readAgain(queryClient, queryKey);
  }
  return true;
}

function peerOf(viewerId: string, message: DirectMessageView): string | null {
  if (message.senderId === viewerId) return message.recipientId;
  if (message.recipientId === viewerId) return message.senderId;
  return null;
}

export function applyDirectMessage(
  queryClient: QueryClient,
  message: DirectMessageView,
  openPeerId: string | null,
): void {
  const session = queryClient.getQueryData<SessionValue>(SESSION_QUERY_KEY);
  if (session?.authenticated !== true) return;
  const viewerId = session.student.id;
  const peerId = peerOf(viewerId, message);
  if (peerId === null) return;
  touchThreadCaches(queryClient, peerId);
  const placed = addToThreadCache(queryClient, peerId, message);
  bumpThreadRow(queryClient, peerId, message, message.recipientId === viewerId, openPeerId);
  if (!placed && message.recipientId === viewerId && openPeerId === peerId) {
    void markThreadRead(queryClient, peerId);
  }
}

export async function sendAndApply(
  queryClient: QueryClient,
  recipientId: string,
  body: string,
): Promise<DmSendOutcome> {
  const writer = queryClient.getQueryData<SessionValue>(SESSION_QUERY_KEY);
  let outcome: DmSendOutcome = { kind: 'noAnswer' };
  await writeAsSignedIn(
    queryClient,
    async () => {
      outcome = await sendDirectMessage(recipientId, body);
      if (outcome.kind === 'refused' && outcome.code === 'unauthenticated') await notifyUnauthorized();
      return outcome;
    },
    async (result) => {
      if (result.kind !== 'sent') return;
      const session = queryClient.getQueryData<SessionValue>(SESSION_QUERY_KEY);
      if (session?.authenticated !== true) return;
      const peer = peerOf(session.student.id, result.message);
      if (peer === null) return;
      touchThreadCaches(queryClient, peer);
      addToThreadCache(queryClient, peer, result.message);
      bumpThreadRow(queryClient, peer, result.message, false);
    },
    () => undefined,
  );
  const current = queryClient.getQueryData<SessionValue>(SESSION_QUERY_KEY);
  if (writer?.authenticated !== true || current?.authenticated !== true || writer.student.id !== current.student.id) {
    return { kind: 'sessionChanged' };
  }
  return outcome;
}

const DM_SEND_TIMEOUT_MS = 10_000;

export type DmSendOutcome =
  | { kind: 'sent'; message: DirectMessageView }
  | { kind: 'refused'; code: string }
  | { kind: 'notConnected' }
  | { kind: 'sessionChanged' }
  | { kind: 'noAnswer' };

export async function sendDirectMessage(recipientId: string, body: string): Promise<DmSendOutcome> {
  if (!socket.connected) return { kind: 'notConnected' };
  let ack: unknown;
  try {
    ack = await socket.timeout(DM_SEND_TIMEOUT_MS).emitWithAck('dm:send', { recipientId, body });
  } catch {
    return { kind: 'noAnswer' };
  }
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

export function isDirectMessage(value: unknown): value is DirectMessageView {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as Record<string, unknown>;
  if (typeof message.id !== 'string' || typeof message.senderId !== 'string') return false;
  if (typeof message.recipientId !== 'string' || typeof message.body !== 'string') return false;
  return typeof message.createdAt === 'string' && !Number.isNaN(Date.parse(message.createdAt));
}

export async function rereadThread(queryClient: QueryClient, peerId: string): Promise<void> {
  await readAgain(queryClient, peerThreadQueryKey(peerId));
}
