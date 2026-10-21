import { infiniteQueryOptions, queryOptions, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { StudentRef } from './profile';

// §6.9's wire shapes. A Takeaway has no `prompt` and never names its Mentor.
export interface PostView {
  id: string;
  origin: 'TAKEAWAY' | 'PROMPT_ANSWER';
  prompt?: { id: string; question: string };
  author: StudentRef;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
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

// The Prompt page reads the feed again once it publishes an answer.
export const FEED_QUERY_KEY = ['feed'] as const;
const STUDENT_POSTS_QUERY_KEY = ['posts', 'student'] as const;
// The Prompt page's answer lists, which hold Posts as well (§6.8).
const PROMPT_ANSWERS_QUERY_KEY = ['prompts', 'answers'] as const;

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

// Writes a Like's answer into every loaded copy of the Post: the feed, any
// profile's Posts and any Prompt's answers. Nothing else on those pages
// changed, so nothing is read again but the likers.
function writeLikeState(client: QueryClient, postId: string, state: LikeState): void {
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
  for (const queryKey of [FEED_QUERY_KEY, STUDENT_POSTS_QUERY_KEY, PROMPT_ANSWERS_QUERY_KEY]) {
    client.setQueriesData<PostPages>({ queryKey }, update);
  }
  void client.invalidateQueries({ queryKey: likersQueryKey(postId) });
}

// `POST` or `DELETE /api/posts/:id/like` (§6.9). A refusal, such as
// `post_unavailable` for a Post a moderator removed, rejects and writes
// nothing to the cache.
export async function setLike(client: QueryClient, postId: string, liked: boolean): Promise<LikeState> {
  const state = await apiFetch<LikeState>(`/posts/${postId}/like`, { method: liked ? 'POST' : 'DELETE' });
  writeLikeState(client, postId, state);
  return state;
}
