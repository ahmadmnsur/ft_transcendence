import { keepPreviousData, queryOptions, type Query, type QueryClient } from '@tanstack/react-query';
import { PAGING } from '@shared/limits';
import { ApiRefusalError, apiFetch } from './client';
import type { StudentRef } from './profile';
import { PROMPT_ANSWERS_QUERY_KEY } from './prompts';
import { writeAsSignedIn } from './session';

// §6.9's wire shapes. A Takeaway has no `prompt` and never names its Mentor;
// a Prompt answer always names its Prompt.
export type PostView = {
  id: string;
  author: StudentRef;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
} & ({ origin: 'TAKEAWAY' } | { origin: 'PROMPT_ANSWER'; prompt: { id: string; question: string } });

export function isPostView(value: unknown): value is PostView {
  if (typeof value !== 'object' || value === null) return false;
  const post = value as Record<string, unknown>;
  if (typeof post.id !== 'string' || typeof post.body !== 'string') return false;
  if (typeof post.createdAt !== 'string' || Number.isNaN(Date.parse(post.createdAt))) return false;
  if (typeof post.likeCount !== 'number' || !Number.isFinite(post.likeCount)) return false;
  if (typeof post.likedByMe !== 'boolean') return false;
  if (typeof post.author !== 'object' || post.author === null) return false;
  const author = post.author as Record<string, unknown>;
  if (typeof author.id !== 'string' || typeof author.displayName !== 'string') return false;
  if (typeof author.avatarUrl !== 'string' && author.avatarUrl !== null) return false;
  if (typeof author.isAdmin !== 'boolean' || typeof author.removed !== 'boolean') return false;
  if (post.origin === 'TAKEAWAY') return true;
  if (post.origin !== 'PROMPT_ANSWER' || typeof post.prompt !== 'object' || post.prompt === null) return false;
  const prompt = post.prompt as Record<string, unknown>;
  return typeof prompt.id === 'string' && typeof prompt.question === 'string';
}

// §6.0.1's numbered page of Posts, newest first, and how many there are.
export interface PostPage {
  items: PostView[];
  total: number;
}

// What both Like writes answer.
export interface LikeState {
  likeCount: number;
  likedByMe: boolean;
}

export const FEED_QUERY_KEY = ['feed'] as const;
const STUDENT_POSTS_QUERY_KEY = ['posts', 'student'] as const;

export function likersQueryKey(postId: string): readonly [string, string, string] {
  return ['posts', 'likers', postId];
}

// Every list of Posts shows 20 a page, the tables' default (§6.0.1).
export const POSTS_PAGE_SIZE = PAGING.defaultPageSize;

function postsPagePath(path: string, page: number): string {
  return `${path}?page=${page}&pageSize=${POSTS_PAGE_SIZE}`;
}

// The feed's page 1 as cached also carries `readNumber`, the number of the
// read that answered it, and every copy of the page keeps it.
type FeedPage = PostPage & { readNumber?: number };

const FIRST_FEED_PAGE_KEY = [...FEED_QUERY_KEY, 1];

// Numbers each read of the feed's page 1 as it starts, so a Post waiting
// behind a read can tell a page read after it arrived (`applyPostCreated`).
let firstPageReads = 0;

// `GET /api/feed` (§6.9), one numbered page. The page on screen stays while
// the next one loads.
export function feedQueryOptions(page: number) {
  return queryOptions({
    queryKey: [...FEED_QUERY_KEY, page],
    queryFn: async (): Promise<FeedPage> => {
      if (page !== 1) return apiFetch<PostPage>(postsPagePath('/feed', page));
      const readNumber = ++firstPageReads;
      return { ...(await apiFetch<PostPage>(postsPagePath('/feed', 1))), readNumber };
    },
    placeholderData: keepPreviousData,
  });
}

// `GET /api/students/:id/posts` (§6.2).
export function studentPostsQueryOptions(studentId: string, page: number) {
  return queryOptions({
    queryKey: [...STUDENT_POSTS_QUERY_KEY, studentId, page],
    queryFn: () => apiFetch<PostPage>(postsPagePath(`/students/${studentId}/posts`, page)),
    placeholderData: keepPreviousData,
  });
}

// `GET /api/posts/:id/likes` (§6.9): every liker, the newest Like first.
export function likersQueryOptions(postId: string) {
  return queryOptions({
    queryKey: likersQueryKey(postId),
    queryFn: () => apiFetch<{ items: StudentRef[] }>(`/posts/${postId}/likes`),
  });
}

// Every list that holds Posts, each page cached on its own: the feed, any
// profile's Posts and any Prompt's answers (§6.8).
const POST_LIST_QUERY_KEYS = [FEED_QUERY_KEY, STUDENT_POSTS_QUERY_KEY, PROMPT_ANSWERS_QUERY_KEY];

// Writes a Like's answer into every loaded copy of the Post at once, then
// reads those lists and the likers again, so whatever order answers arrive
// in, each ends on the server's state: an older Like's late answer cannot
// stay over a newer un-Like. Reads still in flight are cancelled first, since
// one that started before this write would answer from before it; cancelling
// a list's first read leaves it waiting, so the read again starts it anew.
async function cacheLikeState(client: QueryClient, postId: string, state: LikeState): Promise<void> {
  const reread = [...POST_LIST_QUERY_KEYS, likersQueryKey(postId)];
  await Promise.all(reread.map((queryKey) => client.cancelQueries({ queryKey })));
  const update = (data: PostPage | undefined): PostPage | undefined =>
    data === undefined
      ? undefined
      : { ...data, items: data.items.map((post) => (post.id === postId ? { ...post, ...state } : post)) };
  for (const queryKey of POST_LIST_QUERY_KEYS) client.setQueriesData<PostPage>({ queryKey }, update);
  for (const queryKey of reread) void client.invalidateQueries({ queryKey });
}

// Reads one list again from now. A read still in flight may have answered
// before a change, so it is cancelled first: a refetch of a list that has no
// data yet would otherwise be handed that same read.
async function readAgain(client: QueryClient, queryKey: readonly string[]): Promise<void> {
  await client.cancelQueries({ queryKey });
  await client.invalidateQueries({ queryKey });
}

// Waits for the read to settle, then places outside the cache's notification
// so queued Posts never nest. Gives up if the query leaves the cache.
function afterRead(client: QueryClient, query: Query<FeedPage>, then: () => void): void {
  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (event.query !== query) return;
    if (event.type === 'removed') {
      unsubscribe();
      return;
    }
    if (query.state.fetchStatus === 'idle') {
      unsubscribe();
      queueMicrotask(then);
    }
  });
}

// §7.4's client reaction to `post:created`, with the feed in numbered pages
// (§7.4's note of 2026-10-24): a loaded page 1 takes the Post in its place,
// newest first (createdAt, then id), which is the top unless two Posts
// committed in the other order than their createdAt. Page 1 keeps 20 Posts,
// so its last one leaves for page 2, and its `total` grows by one. Another
// page takes nothing: no page is kept fresh (staleTime 0), so each, page 1
// included, is read again when opened. A read in flight is left to finish and
// the Post placed after it, never cancelled: a read that started before the
// commit answers without the Post. One that started after it already holds
// the Post, so the id check keeps it once.
export function applyPostCreated(client: QueryClient, post: PostView): void {
  placePost(client, post, firstPageReads);
}

// `readsAtArrival` counts the page 1 reads started when the Post arrived. A
// page 1 from a later read (a reconnect's, §7.5, or a write's read again)
// already holds the Post, or the Post was removed since, so the Post is left
// out.
function placePost(client: QueryClient, post: PostView, readsAtArrival: number): void {
  const query = client.getQueryCache().find<FeedPage>({ queryKey: FIRST_FEED_PAGE_KEY, exact: true });
  if (query === undefined) return;
  if (query.state.fetchStatus !== 'idle') {
    afterRead(client, query, () => placePost(client, post, readsAtArrival));
    return;
  }
  const data = query.state.data;
  if (data === undefined) return;
  if (data.items.some((item) => item.id === post.id)) return;
  if ((data.readNumber ?? 0) > readsAtArrival) return;
  const createdAt = Date.parse(post.createdAt);
  const index = data.items.findIndex((item) => {
    const itemCreatedAt = Date.parse(item.createdAt);
    return createdAt > itemCreatedAt || (createdAt === itemCreatedAt && post.id > item.id);
  });
  // Older than every Post on page 1 while more pages follow: its place is on
  // a later page, so the feed is read again.
  if (index === -1 && data.total > data.items.length) {
    void readAgain(client, FEED_QUERY_KEY);
    return;
  }
  const items =
    index === -1 ? [...data.items, post] : [...data.items.slice(0, index), post, ...data.items.slice(index)];
  // Only the data changes, so a failed read again of page 1 keeps its error;
  // setQueryData would mark it a success.
  query.setState({ data: { ...data, items: items.slice(0, POSTS_PAGE_SIZE), total: data.total + 1 } });
}

// `POST` or `DELETE /api/posts/:id/like` (§6.9). `likedByMe` belongs to the
// Student who sent it, so an answer that arrives after another Student signed
// in reaches none of the cache (`writeAsSignedIn`). A refusal, such as
// `post_unavailable` for a Post a moderator removed, wrote nothing, so only
// the likers are read again and the Post stays on screen with its notice.
// Any other failure may have reached the server, a Like committed with its
// answer lost, so the lists are read again too. Both writes are idempotent,
// so pressing again after a failure is safe.
export async function setLike(client: QueryClient, postId: string, liked: boolean): Promise<void> {
  let refused = false;
  await writeAsSignedIn(
    client,
    () =>
      apiFetch<LikeState>(`/posts/${postId}/like`, { method: liked ? 'POST' : 'DELETE' }).catch((error: unknown) => {
        refused = error instanceof ApiRefusalError;
        throw error;
      }),
    (state) => cacheLikeState(client, postId, state),
    () => {
      const reread = refused ? [likersQueryKey(postId)] : [...POST_LIST_QUERY_KEYS, likersQueryKey(postId)];
      for (const queryKey of reread) void readAgain(client, queryKey);
    },
  );
}
