import {
  infiniteQueryOptions,
  queryOptions,
  type InfiniteData,
  type Query,
  type QueryClient,
} from '@tanstack/react-query';
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

// §6.0.1's stream page: newest first, and the cursor for the next page.
export interface PostPage {
  items: PostView[];
  nextCursor: string | null;
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

function withCursor(path: string, cursor: string | undefined): string {
  return cursor === undefined ? path : `${path}?cursor=${encodeURIComponent(cursor)}`;
}

// `GET /api/feed` (§6.9), one page per `cursor`.
export function feedQueryOptions() {
  return infiniteQueryOptions({
    queryKey: FEED_QUERY_KEY,
    queryFn: ({ pageParam }) => apiFetch<PostPage>(withCursor('/feed', pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

// `GET /api/students/:id/posts` (§6.2).
export function studentPostsQueryOptions(studentId: string) {
  return infiniteQueryOptions({
    queryKey: [...STUDENT_POSTS_QUERY_KEY, studentId],
    queryFn: ({ pageParam }) => apiFetch<PostPage>(withCursor(`/students/${studentId}/posts`, pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

// `GET /api/posts/:id/likes` (§6.9): every liker, the newest Like first.
export function likersQueryOptions(postId: string) {
  return queryOptions({
    queryKey: likersQueryKey(postId),
    queryFn: () => apiFetch<{ items: StudentRef[] }>(`/posts/${postId}/likes`),
  });
}

type PostPages = InfiniteData<{ items: PostView[] }>;

// Every list that holds Posts: the feed, any profile's Posts and any
// Prompt's answers (§6.8).
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
  const update = (data: PostPages | undefined): PostPages | undefined =>
    data === undefined
      ? undefined
      : {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((post) => (post.id === postId ? { ...post, ...state } : post)),
          })),
        };
  for (const queryKey of POST_LIST_QUERY_KEYS) client.setQueriesData<PostPages>({ queryKey }, update);
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
function afterRead(client: QueryClient, query: Query<InfiniteData<PostPage>>, then: () => void): void {
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

// §7.4's client reaction to `post:created`: a loaded feed takes the Post in
// its place, newest first (createdAt, then id), which is the top unless two
// Posts committed in the other order than their createdAt. A read in flight
// is left to finish and the Post placed after it, never cancelled: cancelling
// would drop a More page the reader asked for, and a read that started before
// the commit answers without the Post. One that started after it already
// holds the Post, so the id check keeps it once.
export function applyPostCreated(client: QueryClient, post: PostView): void {
  const query = client.getQueryCache().find<InfiniteData<PostPage>>({ queryKey: FEED_QUERY_KEY, exact: true });
  if (query === undefined) return;
  if (query.state.fetchStatus !== 'idle') {
    afterRead(client, query, () => applyPostCreated(client, post));
    return;
  }
  const data = query.state.data;
  if (data === undefined) return;
  for (const page of data.pages) {
    if (page.items.some((item) => item.id === post.id)) return;
  }
  if (data.pages.length === 0) {
    void readAgain(client, FEED_QUERY_KEY);
    return;
  }
  const first = data.pages[0];
  const createdAt = Date.parse(post.createdAt);
  const index = first.items.findIndex((item) => {
    const itemCreatedAt = Date.parse(item.createdAt);
    return createdAt > itemCreatedAt || (createdAt === itemCreatedAt && post.id > item.id);
  });
  if (index === -1 && first.nextCursor !== null) {
    void readAgain(client, FEED_QUERY_KEY);
    return;
  }
  const pages = data.pages.map((page, pageIndex) => {
    if (pageIndex !== 0) return page;
    const items =
      index === -1
        ? [...page.items, post]
        : [...page.items.slice(0, index), post, ...page.items.slice(index)];
    return { ...page, items };
  });
  // Only the data changes, so a failed More page keeps its error and Try again;
  // setQueryData would mark the whole feed a success.
  query.setState({ data: { pages, pageParams: data.pageParams } });
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
