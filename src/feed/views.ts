import type { Prisma } from '../generated/prisma/client';
import { STUDENT_REF_SELECT, toStudentRef, type StudentRef } from '../students/student-ref';

// §6.9's wire shapes, exact field names: the SPA depends on them.

// One feed item, as the feed, a single Post, a Student's Posts and a Prompt's
// answers return it. A Takeaway has no `prompt`, and nothing names its Review
// or its Mentor (ADR-0018 d4); a Prompt answer always names its Prompt.
export type PostView = {
  id: string;
  author: StudentRef;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
} & PostOrigin;

// Where a Post came from, as every Post view names it.
export type PostOrigin = { origin: 'TAKEAWAY' } | { origin: 'PROMPT_ANSWER'; prompt: { id: string; question: string } };

// A Post has exactly one origin (§4.4 step 1): no Prompt means a Takeaway.
export function postOrigin(prompt: { id: string; question: string } | null): PostOrigin {
  return prompt === null
    ? { origin: 'TAKEAWAY' }
    : { origin: 'PROMPT_ANSWER', prompt: { id: prompt.id, question: prompt.question } };
}

// §6.0.1's numbered page of Posts, newest first, and how many there are.
export type PostPage = { items: PostView[]; total: number };

// What both Like writes answer (§6.9).
export type LikeState = { likeCount: number; likedByMe: boolean };

// The fields `toPostView` reads, for one viewer: the viewer's own Like is the
// only Like row read, and the others are counted.
export function postViewSelect(viewerId: string) {
  return {
    id: true,
    body: true,
    createdAt: true,
    prompt: { select: { id: true, question: true } },
    author: { select: STUDENT_REF_SELECT },
    likes: { where: { studentId: viewerId }, select: { studentId: true } },
    _count: { select: { likes: true } },
  } as const satisfies Prisma.PostSelect;
}

type PostViewRow = Prisma.PostGetPayload<{ select: ReturnType<typeof postViewSelect> }>;

export function toPostView(row: PostViewRow): PostView {
  return {
    id: row.id,
    ...postOrigin(row.prompt),
    author: toStudentRef(row.author),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    likeCount: row._count.likes,
    likedByMe: row.likes.length > 0,
  };
}
