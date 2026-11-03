import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { StudentRef } from './profile';
import { writeAsSignedIn } from './session';


export interface FriendView {
  student: StudentRef;
  online: boolean;
}

export interface FriendList {
  items: FriendView[];
}

export interface FriendRequestView {
  id: string;
  student: StudentRef;
  createdAt: string;
}

export interface FriendRequestLists {
  incoming: FriendRequestView[];
  outgoing: FriendRequestView[];
}

export interface PresenceUpdate {
  studentId: string;
  online: boolean;
}

export const FRIENDS_QUERY_KEY = ['friends'] as const;
export const FRIEND_REQUESTS_QUERY_KEY = ['friend-requests'] as const;

export async function fetchFriends(): Promise<FriendList> {
  return apiFetch<FriendList>('/friends');
}

export async function fetchFriendRequests(): Promise<FriendRequestLists> {
  return apiFetch<FriendRequestLists>('/friends/requests');
}

export function friendsQueryOptions() {
  return queryOptions({ queryKey: FRIENDS_QUERY_KEY, queryFn: fetchFriends, staleTime: 30_000 });
}

export function friendRequestsQueryOptions() {
  return queryOptions({
    queryKey: FRIEND_REQUESTS_QUERY_KEY,
    queryFn: fetchFriendRequests,
    staleTime: 30_000,
  });
}

async function postFriendRequest(studentId: string): Promise<FriendRequestView> {
  return apiFetch<FriendRequestView>('/friends/requests', { method: 'POST', body: { studentId } });
}

async function postAccept(requestId: string): Promise<FriendView> {
  return apiFetch<FriendView>(`/friends/requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST',
    body: {},
  });
}

async function postDecline(requestId: string): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>(`/friends/requests/${encodeURIComponent(requestId)}/decline`, {
    method: 'POST',
    body: {},
  });
}

async function deleteFriendRequest(requestId: string): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>(`/friends/requests/${encodeURIComponent(requestId)}`, {
    method: 'DELETE',
    body: {},
  });
}

async function deleteFriendship(studentId: string): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>(`/friends/${encodeURIComponent(studentId)}`, {
    method: 'DELETE',
    body: {},
  });
}

async function readAgain(queryClient: QueryClient, queryKey: readonly string[]): Promise<void> {
  await queryClient.cancelQueries({ queryKey });
  await queryClient.invalidateQueries({ queryKey });
}

export function readFriendListsAgain(queryClient: QueryClient): void {
  void readAgain(queryClient, FRIENDS_QUERY_KEY);
  void readAgain(queryClient, FRIEND_REQUESTS_QUERY_KEY);
}

async function updateList<D>(
  queryClient: QueryClient,
  queryKey: readonly string[],
  update: (data: D) => D,
): Promise<void> {
  if (queryClient.getQueryData<D>(queryKey) === undefined) {
    await readAgain(queryClient, queryKey);
    return;
  }
  await queryClient.cancelQueries({ queryKey });
  queryClient.setQueryData<D>(queryKey, (previous) => (previous === undefined ? previous : update(previous)));
  void queryClient.invalidateQueries({ queryKey });
}

function updateFriends(queryClient: QueryClient, update: (list: FriendList) => FriendList): Promise<void> {
  return updateList(queryClient, FRIENDS_QUERY_KEY, update);
}

function updateRequests(
  queryClient: QueryClient,
  update: (lists: FriendRequestLists) => FriendRequestLists,
): Promise<void> {
  return updateList(queryClient, FRIEND_REQUESTS_QUERY_KEY, update);
}

function friendsWrite<T>(
  queryClient: QueryClient,
  send: () => Promise<T>,
  apply: (result: T) => Promise<void>,
): Promise<void> {
  return writeAsSignedIn(queryClient, send, apply, () => readFriendListsAgain(queryClient));
}

function withoutRequest(lists: FriendRequestLists, requestId: string): FriendRequestLists {
  return {
    incoming: lists.incoming.filter((request) => request.id !== requestId),
    outgoing: lists.outgoing.filter((request) => request.id !== requestId),
  };
}

export async function sendFriendRequest(queryClient: QueryClient, studentId: string): Promise<void> {
  await friendsWrite(
    queryClient,
    () => postFriendRequest(studentId),
    (request) =>
      updateRequests(queryClient, (lists) => ({
        incoming: lists.incoming,
        outgoing: [request, ...lists.outgoing.filter((item) => item.id !== request.id)],
      })),
  );
}

export async function acceptFriendRequest(queryClient: QueryClient, requestId: string): Promise<void> {
  await friendsWrite(
    queryClient,
    () => postAccept(requestId),
    async (friend) => {
      await Promise.all([
        updateFriends(queryClient, (list) => ({
          items: [...list.items.filter((item) => item.student.id !== friend.student.id), friend],
        })),
        updateRequests(queryClient, (lists) => withoutRequest(lists, requestId)),
      ]);
    },
  );
}

export async function declineFriendRequest(queryClient: QueryClient, requestId: string): Promise<void> {
  await friendsWrite(
    queryClient,
    () => postDecline(requestId),
    () => updateRequests(queryClient, (lists) => withoutRequest(lists, requestId)),
  );
}

export async function cancelFriendRequest(queryClient: QueryClient, requestId: string): Promise<void> {
  await friendsWrite(
    queryClient,
    () => deleteFriendRequest(requestId),
    () => updateRequests(queryClient, (lists) => withoutRequest(lists, requestId)),
  );
}

export async function endFriendship(queryClient: QueryClient, studentId: string): Promise<void> {
  await friendsWrite(
    queryClient,
    () => deleteFriendship(studentId),
    () => updateFriends(queryClient, (list) => ({ items: list.items.filter((item) => item.student.id !== studentId) })),
  );
}

export async function dropFromFriendLists(queryClient: QueryClient, studentId: string): Promise<void> {
  await Promise.all([
    updateFriends(queryClient, (list) => ({ items: list.items.filter((item) => item.student.id !== studentId) })),
    updateRequests(queryClient, (lists) => ({
      incoming: lists.incoming.filter((request) => request.student.id !== studentId),
      outgoing: lists.outgoing.filter((request) => request.student.id !== studentId),
    })),
  ]);
}

export function isPresenceUpdate(value: unknown): value is PresenceUpdate {
  if (typeof value !== 'object' || value === null) return false;
  const update = value as Record<string, unknown>;
  return typeof update.studentId === 'string' && typeof update.online === 'boolean';
}

export function applyPresence(queryClient: QueryClient, update: PresenceUpdate): void {
  if (queryClient.getQueryState(FRIENDS_QUERY_KEY)?.fetchStatus === 'fetching') {
    readFriendListsAgain(queryClient);
    return;
  }
  const list = queryClient.getQueryData<FriendList>(FRIENDS_QUERY_KEY);
  if (list === undefined) return;
  if (!list.items.some((item) => item.student.id === update.studentId)) {
    readFriendListsAgain(queryClient);
    return;
  }
  queryClient.setQueryData<FriendList>(FRIENDS_QUERY_KEY, {
    items: list.items.map((item) =>
      item.student.id === update.studentId ? { ...item, online: update.online } : item,
    ),
  });
}
