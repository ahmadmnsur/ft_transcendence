import type { PrismaTx } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import type { Role } from '../shared/roles';
import { STUDENT_REF_SELECT, toStudentRef, type StudentRef } from '../students/student-ref';
import { MODERATED_POST_SELECT, toModeratedPost, type GroupTarget, type QueueReport } from './views';


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

export function filedBy(group: readonly ReportRow[], studentId: string): boolean {
  return group.some((row) => row.reporterId === studentId);
}

export function targetKey(row: { postId: string | null; reportedStudentId: string | null }): string {
  return row.postId !== null ? `post:${row.postId}` : `student:${row.reportedStudentId}`;
}

export type Target = { view: GroupTarget; subjectId: string; postRemoved: boolean };

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

export function toQueueReport(row: ReportRow): QueueReport {
  return { reason: row.reason, text: row.text, createdAt: row.createdAt.toISOString() };
}

export type QueueGroups = { visible: Array<[string, ReportRow[]]>; targets: Map<string, Target> };

export async function readQueueGroups(tx: PrismaTx, me: string, role: Role): Promise<QueueGroups> {
  const admin = role === 'ADMIN';
  const rows = await tx.report.findMany({
    where: admin ? { state: 'OPEN' } : { state: 'OPEN', postId: { not: null } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: REPORT_ROW_SELECT,
  });
  const groups = new Map<string, ReportRow[]>();
  for (const row of rows) {
    const key = targetKey(row);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [row]);
    else group.push(row);
  }
  const targets = await readTargets(tx, rows);
  const blocked = new Set<string>();
  if (!admin) {
    const blocks = await tx.block.findMany({
      where: { OR: [{ blockerId: me }, { blockedId: me }] },
      select: { blockerId: true, blockedId: true },
    });
    for (const block of blocks) blocked.add(block.blockerId === me ? block.blockedId : block.blockerId);
  }
  const visible = [...groups].filter(([key, group]) => {
    const target = targetOf(targets, key);
    const parties = [target.subjectId, ...group.map((row) => row.reporterId)];
    return !target.postRemoved && target.subjectId !== me && !parties.some((id) => blocked.has(id));
  });
  return { visible, targets };
}
