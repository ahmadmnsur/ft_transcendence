import type { PostPage } from '../feed/views';
import { toStudentRef, type StudentRef } from '../students/student-ref';

export type PromptView = { id: string; question: string; publishedAt: string };
export type PromptSummary = PromptView & { live: boolean; answerCount: number };
export type PromptPage = { items: PromptSummary[]; total: number; page: number; pageSize: number };
export type AnswerView = {
  id: string;
  origin: 'PROMPT_ANSWER';
  prompt: { id: string; question: string };
  author: StudentRef;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
};
// §6.8: the Prompt, then one page of its non-removed answer Posts, read as
// the feed reads them.
export type AnswerPage = PostPage & {
  prompt: PromptView;
  live: boolean;
  answeredByMe: boolean;
};

export function toPromptView(row: { id: string; question: string; publishedAt: Date }): PromptView {
  return { id: row.id, question: row.question, publishedAt: row.publishedAt.toISOString() };
}

export function toAnswerView(
  post: { id: string; body: string; createdAt: Date; author: Parameters<typeof toStudentRef>[0] },
  prompt: { id: string; question: string },
): AnswerView {
  return {
    id: post.id,
    origin: 'PROMPT_ANSWER',
    prompt: { id: prompt.id, question: prompt.question },
    author: toStudentRef(post.author),
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    likeCount: 0,
    likedByMe: false,
  };
}
