import type { PrismaTx } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { STUDENT_REF_SELECT, toStudentRef, type StudentRef } from '../students/student-ref';
import { MODERATED_POST_SELECT, toModeratedPost, type GroupTarget, type QueueReport } from './views';

// §12.3: a group is derived at read time, never stored. What the queue, the
// resolutions and the resolved audit share: a Report row, its group's key,
// and the group's target with the Student whose interest it touches.

export const REPORT_ROW_SELECT = {
  id: true,
  reporterId: true,
  postId: true,
  reportedStudentId: true,
  reason: true,
  text: true,
  createdAt: true,
} as const satisfies Prisma.ReportSelect;

export type ReportRow = Prisma.ReportGetPayload<{ select: typeof REPORT_ROW_SELECT }>;

// The one target a row names (§4.4 step 2), as a key.
export function targetKey(row: { postId: string | null; reportedStudentId: string | null }): string {
  return row.postId !== null ? `post:${row.postId}` : `student:${row.reportedStudentId}`;
}

// A target as moderation reads it: `subjectId` is the Post's author or the
// reported Student, the one whose own group an actor never reads or
// resolves (ADR-0011 d9). `postRemoved` is true only for a removed Post,
// whose group §12.4 never shows; a Removed Student's open Reports, which the
// Removal itself closes (§12.7), are not hidden on that ground.
export type Target = { view: GroupTarget; subjectId: string; postRemoved: boolean };

// Every target the rows name, in one read per kind, keyed by `targetKey`.
// A Report's targets are never deleted (§4.3.18's FKs), so each is found.
export async function readTargets(tx: PrismaTx, rows: readonly ReportRow[]): Promise<Map<string, Target>> {
  const postIds = new Set<string>();
  const studentIds = new Set<string>();
  for (const row of rows) {
    if (row.postId !== null) postIds.add(row.postId);
    else if (row.reportedStudentId !== null) studentIds.add(row.reportedStudentId);
  }
  const targets = new Map<string, Target>();
  if (postIds.size > 0) {
    const posts = await tx.post.findMany({ where: { id: { in: [...postIds] } }, select: MODERATED_POST_SELECT });
    for (const post of posts) {
      targets.set(targetKey({ postId: post.id, reportedStudentId: null }), {
        view: { kind: 'POST', post: toModeratedPost(post) },
        subjectId: post.authorId,
        postRemoved: post.removedAt !== null,
      });
    }
  }
  if (studentIds.size > 0) {
    const students = await tx.student.findMany({ where: { id: { in: [...studentIds] } }, select: STUDENT_REF_SELECT });
    for (const student of students) {
      targets.set(targetKey({ postId: null, reportedStudentId: student.id }), {
        view: { kind: 'STUDENT', student: toStudentRef(student) },
        subjectId: student.id,
        postRemoved: false,
      });
    }
  }
  return targets;
}

// The people the ids name, in one read. A Student row is never deleted, so
// `refOf` missing one is the impossible case `internal_error` stands for.
export async function readRefs(tx: PrismaTx, ids: Iterable<string>): Promise<Map<string, StudentRef>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await tx.student.findMany({ where: { id: { in: unique } }, select: STUDENT_REF_SELECT });
  return new Map(rows.map((row) => [row.id, toStudentRef(row)]));
}

export function refOf(refs: ReadonlyMap<string, StudentRef>, id: string): StudentRef {
  const ref = refs.get(id);
  if (ref === undefined) throw new Error(`moderation: Student ${id} was not read.`);
  return ref;
}

export function targetOf(targets: ReadonlyMap<string, Target>, key: string): Target {
  const target = targets.get(key);
  if (target === undefined) throw new Error(`moderation: target ${key} was not read.`);
  return target;
}

// A row as every reader may see it; only an Admin adds the reporter.
export function toQueueReport(row: ReportRow): QueueReport {
  return { reason: row.reason, text: row.text, createdAt: row.createdAt.toISOString() };
}
