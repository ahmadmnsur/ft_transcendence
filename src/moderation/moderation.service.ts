import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { blockPair } from '../core/block-pair';
import { ApiError } from '../core/errors';
import { UnitOfWork, type PrismaTx, type TxContext } from '../core/uow';
import { Prisma } from '../generated/prisma/client';
import type { PostGroupAction, ResolvedState, StudentGroupAction } from '../shared/reports';
import type { Role } from '../shared/roles';
import { readActiveActor, readActiveAdmin, readActiveRole } from '../students/profile-writes';
import {
  REPORT_ROW_SELECT,
  readRefs,
  readTargets,
  refOf,
  targetKey,
  targetOf,
  toQueueReport,
  type ReportRow,
} from './groups';
import { ALREADY_REPORTED, alreadyResolved, conflictOfInterest, reportTargetInvalid } from './refusals';
import type {
  ModerationQueue,
  QueueGroup,
  ReportInput,
  ReportReceipt,
  Resolution,
  ResolvedBatch,
  ResolvedPage,
} from './views';

// §12.5: an action re-reads the actor's role and flags in its own
// transaction, so a stale queue grants nothing.
const MODERATION_ROLES = ['PEER_MODERATOR', 'ADMIN'] as const;

// §12.3: the group's OPEN rows at this transaction's serialization point.
function openRows(tx: PrismaTx, target: Prisma.ReportWhereInput): Promise<Array<{ id: string; reporterId: string }>> {
  return tx.report.findMany({ where: { ...target, state: 'OPEN' }, select: { id: true, reporterId: true } });
}

// §12.5: every row of the group gets one state, one resolver and one time.
async function closeGroup(
  tx: PrismaTx,
  ctx: TxContext,
  resolverId: string,
  rows: ReadonlyArray<{ id: string }>,
  state: ResolvedState,
): Promise<Resolution> {
  const { count } = await tx.report.updateMany({
    where: { id: { in: rows.map((row) => row.id) }, state: 'OPEN' },
    data: { state, resolvedById: resolverId, resolvedAt: ctx.now },
  });
  return { state, count };
}

// One batch's key as `GROUP BY` returns it (§12.6). The pg adapter maps a
// uuid to a string and a timestamptz to a Date.
type BatchKey = {
  post_id: string | null;
  reported_student_id: string | null;
  resolved_by_id: string;
  resolved_at: Date;
  state: ResolvedState;
};

function batchKey(target: string, resolvedById: string, resolvedAt: Date, state: string): string {
  return `${target}|${resolvedById}|${resolvedAt.toISOString()}|${state}`;
}

// §12.6, ADR-0011 d9: the batches a viewing Admin may read — none whose
// target is their Student row or their Post, and none holding a row they
// filed. Each batch is whole: a row is never filtered out of one.
function visibleBatches(viewerId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT r.post_id, r.reported_student_id, r.resolved_by_id, r.resolved_at, r.state
      FROM "Report" r
      LEFT JOIN "Post" p ON p.id = r.post_id
     WHERE r.state <> 'OPEN'
       AND r.reported_student_id IS DISTINCT FROM ${viewerId}::uuid
       AND p.author_id IS DISTINCT FROM ${viewerId}::uuid
     GROUP BY r.post_id, r.reported_student_id, r.resolved_by_id, r.resolved_at, r.state
    HAVING NOT bool_or(r.reporter_id = ${viewerId}::uuid)`;
}

// §3.4: moderation owns Report. Filing, the queue, the two group
// resolutions and the resolved audit; none sends an event or awards XP.
@Injectable()
export class ModerationService {
  constructor(private readonly uow: UnitOfWork) {}

  // §12.2, ADR-0011 d5: the indexes decide duplicates without reading reports.
  file(actor: Actor, input: ReportInput): Promise<ReportReceipt> {
    return this.uow.run({
      name: 'report.file',
      uniqueRefusals: {
        report_one_per_reporter_post: ALREADY_REPORTED,
        report_one_per_reporter_student: ALREADY_REPORTED,
      },
    }, async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const target = input.target;
      let columns: { postId: string | null; reportedStudentId: string | null };
      if ('postId' in target) {
        const post = await tx.post.findUnique({
          where: { id: target.postId },
          select: { removedAt: true, authorId: true },
        });
        if (post === null || post.removedAt !== null || post.authorId === actor.studentId) {
          throw reportTargetInvalid();
        }
        columns = { postId: target.postId, reportedStudentId: null };
      } else {
        const student = await tx.student.findUnique({
          where: { id: target.studentId },
          select: { id: true, removedAt: true },
        });
        if (student === null || student.removedAt !== null || student.id === actor.studentId) {
          throw reportTargetInvalid();
        }
        columns = { postId: null, reportedStudentId: target.studentId };
      }
      await ctx.checkpoint('report.file');
      await tx.report.create({
        data: {
          reporterId: actor.studentId,
          ...columns,
          reason: input.reason,
          text: input.text ?? null,
          createdAt: ctx.now,
        },
      });
      return { received: true };
    });
  }

  // §12.4: one snapshot of every open group the reader may see, ordered by
  // each group's oldest open row. `role` is the one the request's session
  // guard read (§3.4). A Peer Moderator reads Post groups only, without
  // reporters, and loses a whole group to their own interest in it or to a
  // Block, either way, with its author or any open reporter (ADR-0011 d7). An
  // Admin reads both kinds with reporters, except their own target and any
  // group holding a row they filed (ADR-0011 d9). An open group's Post is
  // never removed — removal resolves it — and that is checked all the same.
  queue(actor: Actor, role: Role): Promise<ModerationQueue> {
    const admin = role === 'ADMIN';
    const me = actor.studentId;
    return this.uow.readOnly(async (tx) => {
      const rows = await tx.report.findMany({
        where: admin ? { state: 'OPEN' } : { state: 'OPEN', postId: { not: null } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: REPORT_ROW_SELECT,
      });
      // Insertion order is each group's oldest row.
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
        return !target.postRemoved && !parties.includes(me) && !parties.some((id) => blocked.has(id));
      });
      const reporters = admin ? await readRefs(tx, visible.flatMap(([, group]) => group.map((row) => row.reporterId))) : null;
      return {
        items: visible.map(([key, group]): QueueGroup => ({
          target: targetOf(targets, key).view,
          count: group.length,
          reports: group.map((row) =>
            reporters === null ? toQueueReport(row) : { ...toQueueReport(row), reporter: refOf(reporters, row.reporterId) },
          ),
        })),
      };
    });
  }

  // `POST /api/moderation/post-groups/:postId/resolve` (§12.5, M25): the only
  // way a Post is ever removed, by a Peer Moderator or an Admin. The guard is
  // read now, never trusted from the queue: the actor's own interest for
  // either role, and for a Peer Moderator every Block edge with the author
  // and the open reporters (ADR-0008 d10, ADR-0011 d7). No event: a removed
  // Post leaves the feed on its next load.
  resolvePostGroup(actor: Actor, postId: string, action: PostGroupAction): Promise<Resolution> {
    return this.uow.run('moderation.resolve', async (tx, ctx) => {
      const role = await readActiveRole(tx, actor.studentId, MODERATION_ROLES);
      const post = await tx.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true, removedAt: true } });
      const open = post === null || post.removedAt !== null ? [] : await openRows(tx, { postId: post.id });
      if (post === null || open.length === 0) throw alreadyResolved();
      const parties = [post.authorId, ...open.map((row) => row.reporterId)];
      if (parties.includes(actor.studentId)) throw conflictOfInterest();
      if (role === 'PEER_MODERATOR') {
        const block = await tx.block.findFirst({
          where: { OR: parties.map((id) => blockPair(actor.studentId, id)) },
          select: { id: true },
        });
        if (block !== null) throw conflictOfInterest();
      }
      await ctx.checkpoint('moderation.resolve');
      if (action === 'REMOVE_POST') {
        await tx.post.update({ where: { id: post.id }, data: { removedAt: ctx.now } });
        return closeGroup(tx, ctx, actor.studentId, open, 'ACTIONED');
      }
      return closeGroup(tx, ctx, actor.studentId, open, 'DISMISSED');
    });
  }

  // `POST /api/moderation/student-groups/:studentId/resolve` (§12.5): an
  // Admin's alone. `ACTION` records that the Reports were acted on and
  // applies no sanction: Suspension and Removal are Users-table actions
  // (§12.7). An Admin's guard is self-interest only, with no Block test.
  resolveStudentGroup(actor: Actor, studentId: string, action: StudentGroupAction): Promise<Resolution> {
    return this.uow.run('moderation.resolve', async (tx, ctx) => {
      await readActiveAdmin(tx, actor.studentId);
      const student = await tx.student.findUnique({ where: { id: studentId }, select: { id: true } });
      const open = student === null ? [] : await openRows(tx, { reportedStudentId: student.id });
      if (student === null || open.length === 0) throw alreadyResolved();
      if ([student.id, ...open.map((row) => row.reporterId)].includes(actor.studentId)) throw conflictOfInterest();
      await ctx.checkpoint('moderation.resolve');
      return closeGroup(tx, ctx, actor.studentId, open, action === 'ACTION' ? 'ACTIONED' : 'DISMISSED');
    });
  }

  // `GET /api/admin/reports/resolved` (§12.6): one page of the batches the
  // viewing Admin may read, newest first, in one snapshot. The Post's text
  // shows even once it is removed, and every row names its reporter.
  resolvedAudit(actor: Actor, page: number, pageSize: number): Promise<ResolvedPage> {
    const batches = visibleBatches(actor.studentId);
    return this.uow.readOnly(async (tx) => {
      const [{ total }] = await tx.$queryRaw<Array<{ total: number }>>`
        SELECT count(*)::int AS total FROM (${batches}) AS b`;
      const skip = (page - 1) * pageSize;
      if (skip >= total) return { items: [], total };
      const keys = await tx.$queryRaw<Array<BatchKey>>`
        SELECT * FROM (${batches}) AS b
         ORDER BY resolved_at DESC, state, post_id, reported_student_id, resolved_by_id
         LIMIT ${pageSize} OFFSET ${skip}`;
      const rows = await tx.report.findMany({
        where: {
          OR: keys.map((key) => ({
            postId: key.post_id,
            reportedStudentId: key.reported_student_id,
            resolvedById: key.resolved_by_id,
            resolvedAt: key.resolved_at,
            state: key.state,
          })),
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { ...REPORT_ROW_SELECT, resolvedById: true, resolvedAt: true, state: true },
      });
      // `report_state_attribution` gives every resolved row both fields.
      const byBatch = new Map<string, ReportRow[]>();
      for (const row of rows) {
        if (row.resolvedById === null || row.resolvedAt === null) continue;
        const key = batchKey(targetKey(row), row.resolvedById, row.resolvedAt, row.state);
        const batch = byBatch.get(key);
        if (batch === undefined) byBatch.set(key, [row]);
        else batch.push(row);
      }
      const targets = await readTargets(tx, rows);
      const people = await readRefs(tx, [...keys.map((key) => key.resolved_by_id), ...rows.map((row) => row.reporterId)]);
      return {
        items: keys.map((key): ResolvedBatch => {
          const target = targetKey({ postId: key.post_id, reportedStudentId: key.reported_student_id });
          const batch = byBatch.get(batchKey(target, key.resolved_by_id, key.resolved_at, key.state)) ?? [];
          return {
            target: targetOf(targets, target).view,
            state: key.state,
            resolvedBy: refOf(people, key.resolved_by_id),
            resolvedAt: key.resolved_at.toISOString(),
            reports: batch.map((row) => ({ ...toQueueReport(row), reporter: refOf(people, row.reporterId) })),
          };
        }),
        total,
      };
    });
  }
}
