import { postOrigin, type PostOrigin } from '../feed/views';
import type { Prisma } from '../generated/prisma/client';
import type { ReportReason, ReportTarget, ResolvedState } from '../shared/reports';
import { STUDENT_REF_SELECT, toStudentRef, type StudentRef } from '../students/student-ref';

// §12.2's wire shapes, exact field names: the SPA depends on them.
export type ReportInput = { target: ReportTarget; reason: ReportReason; text?: string };

// ADR-0011 d12: the honest confirmation; the reporter is told nothing more.
export type ReportReceipt = { received: true };

// §12.4–§12.6's wire shapes, exact field names: the SPA depends on them.

// A reported Post as moderation reads it: its body, author, origin and time,
// and whether it is removed, which only the resolved audit ever shows true
// (§12.6). No Like is read.
export type ModeratedPost = {
  id: string;
  author: StudentRef;
  body: string;
  createdAt: string;
  removed: boolean;
} & PostOrigin;

// The one target a group or a batch has (§12.3).
export type GroupTarget = { kind: 'POST'; post: ModeratedPost } | { kind: 'STUDENT'; student: StudentRef };

// One open Report as a Peer Moderator reads it: never who filed it
// (ADR-0011 d9).
export type QueueReport = { reason: ReportReason; text: string | null; createdAt: string };

// An Admin reads the reporter too.
export type NamedReport = QueueReport & { reporter: StudentRef };

// §12.4: one open group, its rows oldest first. A Peer Moderator's groups
// are Post groups of `QueueReport`s only.
export type QueueGroup = { target: GroupTarget; count: number; reports: Array<QueueReport | NamedReport> };

// `GET /api/moderation/queue`: every group the reader may see, ordered by
// each group's oldest open row. Not paged.
export type ModerationQueue = { items: QueueGroup[] };

// §12.5: what a resolution wrote.
export type Resolution = { state: ResolvedState; count: number };

// §12.6: one resolution batch, the rows sharing target, resolver, time and
// state, each with its reporter.
export type ResolvedBatch = {
  target: GroupTarget;
  state: ResolvedState;
  resolvedBy: StudentRef;
  resolvedAt: string;
  reports: NamedReport[];
};

// §6.0.1's table page of batches, newest first.
export type ResolvedPage = { items: ResolvedBatch[]; total: number };

// The fields `toModeratedPost` reads.
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
  // A Takeaway names no Mentor (ADR-0018 d4).
  return {
    id: row.id,
    ...postOrigin(row.prompt),
    author: toStudentRef(row.author),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    removed: row.removedAt !== null,
  };
}
