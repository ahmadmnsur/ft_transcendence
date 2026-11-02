import { keepPreviousData, queryOptions, type Query, type QueryClient } from '@tanstack/react-query';
import { PAGING } from '@shared/limits';
import { ApiRefusalError, apiFetch } from './client';
import type { StudentRef } from './profile';
import { PROMPT_ANSWERS_QUERY_KEY } from './prompts';
import { writeAsSignedIn } from './session';

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

export function isPostRemoved(value: unknown): value is { postId: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const post = value as Record<string, unknown>;
  return typeof post.postId === 'string';
}

export interface PostPage {
  items: PostView[];
  total: number;
}

export interface LikeState {
  likeCount: number;
  likedByMe: boolean;
}

export interface PostLikesUpdate {
  postId: string;
  likeCount: number;
}

export function isPostLikesUpdate(value: unknown): value is PostLikesUpdate {
  if (typeof value !== 'object' || value === null) return false;
  const update = value as Record<string, unknown>;
  return typeof update.postId === 'string' && typeof update.likeCount === 'number' && Number.isFinite(update.likeCount);
}

export const FEED_QUERY_KEY = ['feed'] as const;
const STUDENT_POSTS_QUERY_KEY = ['posts', 'student'] as const;

export function likersQueryKey(postId: string): readonly [string, string, string] {
  return ['posts', 'likers', postId];
}

export const POSTS_PAGE_SIZE = PAGING.defaultPageSize;

function postsPagePath(path: string, page: number): string {
  return `${path}?page=${page}&pageSize=${POSTS_PAGE_SIZE}`;
}

type FeedPage = PostPage & { readNumber?: number };

const FIRST_FEED_PAGE_KEY = [...FEED_QUERY_KEY, 1];

let firstPageReads = 0;

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

export function studentPostsQueryOptions(studentId: string, page: number) {
  return queryOptions({
    queryKey: [...STUDENT_POSTS_QUERY_KEY, studentId, page],
    queryFn: () => apiFetch<PostPage>(postsPagePath(`/students/${studentId}/posts`, page)),
    placeholderData: keepPreviousData,
  });
}

export function likersQueryOptions(postId: string) {
  return queryOptions({
    queryKey: likersQueryKey(postId),
    queryFn: () => apiFetch<{ items: StudentRef[] }>(`/posts/${postId}/likes`),
  });
}

const POST_LIST_QUERY_KEYS = [FEED_QUERY_KEY, STUDENT_POSTS_QUERY_KEY, PROMPT_ANSWERS_QUERY_KEY];

function postLikesUpdater(postId: string, state: { likeCount: number; likedByMe?: boolean }) {
  return (data: PostPage | undefined): PostPage | undefined =>
    data === undefined
      ? undefined
      : { ...data, items: data.items.map((post) => (post.id === postId ? { ...post, ...state } : post)) };
}

function cachePostLikes(client: QueryClient, postId: string, state: { likeCount: number; likedByMe?: boolean }): void {
  const update = postLikesUpdater(postId, state);
  for (const queryKey of POST_LIST_QUERY_KEYS) client.setQueriesData<PostPage>({ queryKey }, update);
}

export function applyPostLikes(client: QueryClient, update: PostLikesUpdate): void {
  const setLikes = postLikesUpdater(update.postId, { likeCount: update.likeCount });
  for (const queryKey of POST_LIST_QUERY_KEYS) {
    for (const query of client.getQueryCache().findAll({ queryKey })) {
      if (query.state.fetchStatus !== 'idle') {
        const reading = query.promise;
        afterRead(client, query, (settled, failed) => {
          if ((settled !== reading && !failed) || query.state.fetchStatus !== 'idle') return;
          client.setQueryData<PostPage>(query.queryKey, setLikes);
        });
        continue;
      }
      client.setQueryData<PostPage>(query.queryKey, setLikes);
    }
  }
}

async function cacheLikeState(client: QueryClient, postId: string, state: LikeState): Promise<void> {
  const reread = [...POST_LIST_QUERY_KEYS, likersQueryKey(postId)];
  await Promise.all(reread.map((queryKey) => client.cancelQueries({ queryKey })));
  cachePostLikes(client, postId, state);
  for (const queryKey of reread) void client.invalidateQueries({ queryKey });
}

async function readAgain(client: QueryClient, queryKey: readonly unknown[]): Promise<void> {
  await client.cancelQueries({ queryKey });
  await client.invalidateQueries({ queryKey });
}

function afterRead<T>(
  client: QueryClient,
  query: Query<T>,
  then: (reading: Promise<T> | undefined, failed: boolean) => void,
): void {
  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (event.query !== query) return;
    if (event.type === 'removed') {
      unsubscribe();
      return;
    }
    if (query.state.fetchStatus === 'idle') {
      unsubscribe();
      const reading = query.promise;
      const failed = query.state.status === 'error';
      queueMicrotask(() => then(reading, failed));
    }
  });
}

export function applyPostCreated(client: QueryClient, post: PostView): void {
  placePost(client, post, firstPageReads);
}

export function applyPostRemoved(client: QueryClient, postId: string): void {
  for (const queryKey of POST_LIST_QUERY_KEYS) {
    const queries = client.getQueryCache().findAll({ queryKey });
    for (const query of queries) {
      const data = query.state.data as PostPage | undefined;
      if (query.state.fetchStatus !== 'fetching' && !data?.items.some((post) => post.id === postId)) continue;
      void dropPostFromPage(client, query.queryKey, postId);
    }
  }
}

async function dropPostFromPage(client: QueryClient, queryKey: readonly unknown[], postId: string): Promise<void> {
  await client.cancelQueries({ queryKey, exact: true });
  client.setQueryData<PostPage>(queryKey, (data) =>
    data === undefined || !data.items.some((post) => post.id === postId)
      ? data
      : { ...data, items: data.items.filter((post) => post.id !== postId), total: data.total - 1 },
  );
  await client.invalidateQueries({ queryKey, exact: true });
}

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
  if (index === -1 && data.total > data.items.length) {
    void readAgain(client, FIRST_FEED_PAGE_KEY);
    return;
  }
  const items =
    index === -1 ? [...data.items, post] : [...data.items.slice(0, index), post, ...data.items.slice(index)];
  query.setState({ data: { ...data, items: items.slice(0, POSTS_PAGE_SIZE), total: data.total + 1 } });
}

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
