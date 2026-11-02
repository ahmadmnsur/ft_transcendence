import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { blockPair } from '../core/block-pair';
import { ApiError } from '../core/errors';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork } from '../core/uow';
import { Prisma } from '../generated/prisma/client';
import type { PostGroupAction, ResolvedState, StudentGroupAction } from '../shared/reports';
import type { Role } from '../shared/roles';
import { readActiveActor, readActiveAdmin, readActiveRole } from '../students/profile-writes';
import { closeGroup, openRows } from './group-writes';
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

const MODERATION_ROLES = ['PEER_MODERATOR', 'ADMIN'] as const;

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

@Injectable()
export class ModerationService {
  constructor(private readonly uow: UnitOfWork, private readonly publisher: RealtimePublisher) {}

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
      ctx.afterCommit(() => this.publisher.reportsChanged());
      return { received: true };
    });
  }

  queue(actor: Actor, role: Role): Promise<ModerationQueue> {
    const admin = role === 'ADMIN';
    const me = actor.studentId;
    return this.uow.readOnly(async (tx) => {
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
      ctx.afterCommit(() => this.publisher.reportsChanged());
      if (action === 'REMOVE_POST') {
        await tx.post.update({ where: { id: post.id }, data: { removedAt: ctx.now } });
        ctx.afterCommit(() => this.publisher.postRemoved(post.id));
        return closeGroup(tx, ctx, actor.studentId, open, 'ACTIONED');
      }
      return closeGroup(tx, ctx, actor.studentId, open, 'DISMISSED');
    });
  }

  resolveStudentGroup(actor: Actor, studentId: string, action: StudentGroupAction): Promise<Resolution> {
    return this.uow.run('moderation.resolve', async (tx, ctx) => {
      await readActiveAdmin(tx, actor.studentId);
      const student = await tx.student.findUnique({ where: { id: studentId }, select: { id: true } });
      const open = student === null ? [] : await openRows(tx, { reportedStudentId: student.id });
      if (student === null || open.length === 0) throw alreadyResolved();
      if ([student.id, ...open.map((row) => row.reporterId)].includes(actor.studentId)) throw conflictOfInterest();
      await ctx.checkpoint('moderation.resolve');
      ctx.afterCommit(() => this.publisher.reportsChanged());
      return closeGroup(tx, ctx, actor.studentId, open, action === 'ACTION' ? 'ACTIONED' : 'DISMISSED');
    });
  }

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
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { ...REPORT_ROW_SELECT, resolvedById: true, resolvedAt: true, state: true },
      });
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
