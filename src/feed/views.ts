import type { Prisma } from '../generated/prisma/client';
import { STUDENT_REF_SELECT, toStudentRef, type StudentRef } from '../students/student-ref';


export type PostView = {
  id: string;
  author: StudentRef;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
} & PostOrigin;

export type PostOrigin = { origin: 'TAKEAWAY' } | { origin: 'PROMPT_ANSWER'; prompt: { id: string; question: string } };

export function postOrigin(prompt: { id: string; question: string } | null): PostOrigin {
  return prompt === null
    ? { origin: 'TAKEAWAY' }
    : { origin: 'PROMPT_ANSWER', prompt: { id: prompt.id, question: prompt.question } };
}

export type PostPage = { items: PostView[]; total: number };

export type LikeState = { likeCount: number; likedByMe: boolean };

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
