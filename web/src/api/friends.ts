import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { StudentRef } from './profile';
import { writeAsSignedIn } from './session';

// §6.4's Friends routes, with the exact wire shapes the API returns.

// One accepted Friend and whether they are online now (§7.6). A Removed
// Student never appears (§11.1).
export interface FriendView {
  student: StudentRef;
  online: boolean;
}

export interface FriendList {
  items: FriendView[];
}

// One pending request from the signed-in Student's side: `student` is the
// other party. `createdAt` is an ISO 8601 timestamp.
export interface FriendRequestView {
  id: string;
  student: StudentRef;
  createdAt: string;
}

export interface FriendRequestLists {
  incoming: FriendRequestView[];
  outgoing: FriendRequestView[];
}

// §7.4's `presence:update` payload.
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

// Two lists, read by a profile's friend control and by `/friends`, so both
// always agree. Briefly cached like the Blocks: the profile page starts the
// reads and the control reads them a moment later without a second request,
// and every write here updates the cached copies at once.
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

// A refusal (`friend_request_unavailable`, `friendship_exists`,
// `request_not_pending`, `not_friends`, `student_removed`,
// `self_action_forbidden`) is a typed 200 (§6.15).
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

// Reads one list again from now. A read still in flight may have answered
// before a change, so it is cancelled first: a refetch of a list that has no
// data yet would otherwise be handed that same read.
async function readAgain(queryClient: QueryClient, queryKey: readonly string[]): Promise<void> {
  await queryClient.cancelQueries({ queryKey });
  await queryClient.invalidateQueries({ queryKey });
}

function readListsAgain(queryClient: QueryClient): void {
  void readAgain(queryClient, FRIENDS_QUERY_KEY);
  void readAgain(queryClient, FRIEND_REQUESTS_QUERY_KEY);
}

// After a write, the one list it changed takes its result at once, and is
// then read again: another write may have changed the same pair while this
// one's answer was on its way (a Block deleting the request just sent, say),
// and the server orders Friends by name with a collation the browser does not
// have. A read still in flight read the list before the write, so it is
// cancelled first. A list with no data yet is only read again: its first read
// may be the one in flight, and cancelling it alone would leave it loading.
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

// Every write as the screens use it. Its answer updates the lists it changed;
// a failure reads both lists again, since the server may hold something else
// (the other Student answered, cancelled or blocked first, or another tab
// acted), and is rethrown for the screen to show.
function friendsWrite<T>(
  queryClient: QueryClient,
  send: () => Promise<T>,
  apply: (result: T) => Promise<void>,
): Promise<void> {
  return writeAsSignedIn(queryClient, send, apply, () => readListsAgain(queryClient));
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

// The new Friend joins the list at once, at its end until the list is read
// again in the server's order.
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

// §11.2: a Block deletes the pair's Friendship row, pending or accepted, so
// both cached lists drop that Student once the Block is made. The caller has
// already checked that the Block is the signed-in Student's own.
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

// §7.4's client reaction to `presence:update`: the cached Friends list takes
// the new status. An update about a Student the list does not hold means the
// lists are out of date (the other Student accepted a request in their own
// tab, say): both are read again, so the request leaves Sent as the other
// Student joins the Friends. A Friends read in flight may have answered
// before the change, so it is cancelled and made again instead, even a first
// read with no data yet; whether its answer holds the Student is not known
// yet, so the requests are read again with it.
export function applyPresence(queryClient: QueryClient, update: PresenceUpdate): void {
  if (queryClient.getQueryState(FRIENDS_QUERY_KEY)?.fetchStatus === 'fetching') {
    readListsAgain(queryClient);
    return;
  }
  const list = queryClient.getQueryData<FriendList>(FRIENDS_QUERY_KEY);
  if (list === undefined) return;
  if (!list.items.some((item) => item.student.id === update.studentId)) {
    readListsAgain(queryClient);
    return;
  }
  queryClient.setQueryData<FriendList>(FRIENDS_QUERY_KEY, {
    items: list.items.map((item) =>
      item.student.id === update.studentId ? { ...item, online: update.online } : item,
    ),
  });
}
