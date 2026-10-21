import type { StudentRef } from '../students/student-ref';

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
export type AnswerPage = {
  prompt: PromptView;
  live: boolean;
  answeredByMe: boolean;
  items: AnswerView[];
  nextCursor: string | null;
};

export function toPromptView(row: { id: string; question: string; publishedAt: Date }): PromptView {
  return { id: row.id, question: row.question, publishedAt: row.publishedAt.toISOString() };
}
