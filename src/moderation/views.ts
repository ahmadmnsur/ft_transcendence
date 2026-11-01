import { postOrigin, type PostOrigin } from '../feed/views';
import type { Prisma } from '../generated/prisma/client';
import type { ReportReason, ReportTarget, ResolvedState } from '../shared/reports';
import { STUDENT_REF_SELECT, toStudentRef, type StudentRef } from '../students/student-ref';

export type ReportInput = { target: ReportTarget; reason: ReportReason; text?: string };

export type ReportReceipt = { received: true };


export type ModeratedPost = {
  id: string;
  author: StudentRef;
  body: string;
  createdAt: string;
  removed: boolean;
} & PostOrigin;

export type GroupTarget = { kind: 'POST'; post: ModeratedPost } | { kind: 'STUDENT'; student: StudentRef };

export type QueueReport = { reason: ReportReason; text: string | null; createdAt: string };

export type NamedReport = QueueReport & { reporter: StudentRef };

export type QueueGroup = { target: GroupTarget; count: number; reports: Array<QueueReport | NamedReport> };

export type ModerationQueue = { items: QueueGroup[] };

export type Resolution = { state: ResolvedState; count: number };

export type ResolvedBatch = {
  target: GroupTarget;
  state: ResolvedState;
  resolvedBy: StudentRef;
  resolvedAt: string;
  reports: NamedReport[];
};

export type ResolvedPage = { items: ResolvedBatch[]; total: number };

export const MODERATED_POST_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  removedAt: true,
  authorId: true,
  prompt: { select: { id: true, question: true } },
  author: { select: STUDENT_REF_SELECT },
} as const satisfies Prisma.PostSelect;

export type ModeratedPostRow = Prisma.PostGetPayload<{ select: typeof MODERATED_POST_SELECT }>;

export function toModeratedPost(row: ModeratedPostRow): ModeratedPost {
  return {
    id: row.id,
    ...postOrigin(row.prompt),
    author: toStudentRef(row.author),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    removed: row.removedAt !== null,
  };
}
