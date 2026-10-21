import { infiniteQueryOptions, queryOptions, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
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

// Writes a Like's answer into every loaded copy of the Post. A read of those
// lists still in flight is cancelled first, so its older answer cannot land
// over this one. Nothing else on those pages changed, so nothing is read
// again but the likers.
async function cacheLikeState(client: QueryClient, postId: string, state: LikeState): Promise<void> {
  await Promise.all(POST_LIST_QUERY_KEYS.map((queryKey) => client.cancelQueries({ queryKey })));
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
  void client.invalidateQueries({ queryKey: likersQueryKey(postId) });
}

// `POST` or `DELETE /api/posts/:id/like` (§6.9). `likedByMe` belongs to the
// Student who sent it, so an answer that arrives after another Student signed
// in reaches none of the cache (`writeAsSignedIn`). A refusal, such as
// `post_unavailable` for a Post a moderator removed, rejects and writes
// nothing. Both writes are idempotent and answer the Post's true state, so
// pressing again after a failure is safe.
export async function setLike(client: QueryClient, postId: string, liked: boolean): Promise<void> {
  await writeAsSignedIn(
    client,
    () => apiFetch<LikeState>(`/posts/${postId}/like`, { method: liked ? 'POST' : 'DELETE' }),
    (state) => cacheLikeState(client, postId, state),
    () => void client.invalidateQueries({ queryKey: likersQueryKey(postId) }),
  );
}
