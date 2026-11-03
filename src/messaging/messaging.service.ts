import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { blockPair } from '../core/block-pair';
import { encodeCursor, type Cursor } from '../core/cursor';
import { ApiError } from '../core/errors';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork, type PrismaTx } from '../core/uow';
import { Prisma } from '../generated/prisma/client';
import { PAGING } from '../shared/limits';
import { readActiveActor } from '../students/profile-writes';
import { STUDENT_REF_SELECT, toStudentRef } from '../students/student-ref';
import { dmUnavailable } from './refusals';
import { unreadMessagesWhere } from './unread';
import type { DirectMessageView, PeerThread, ThreadPage, ThreadView } from './views';


const MESSAGES_PER_PAGE = PAGING.maxPageSize;

type MessageRow = { id: string; sender_id: string; recipient_id: string; body: string; created_at: Date };

type ThreadRow = MessageRow & { peer_id: string };

function toMessageView(row: MessageRow): DirectMessageView {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    createdAt: row.created_at.toISOString(),
  };
}

function olderThan(cursor: Cursor): Prisma.Sql {
  return Prisma.sql`("created_at" < ${cursor.createdAt}::timestamptz
      OR ("created_at" = ${cursor.createdAt}::timestamptz AND "id" < ${cursor.id}::uuid))`;
}

function andOlderThan(cursor: Cursor | null): Prisma.Sql {
  return cursor === null ? Prisma.empty : Prisma.sql`AND ${olderThan(cursor)}`;
}

function whereOlderThan(cursor: Cursor | null): Prisma.Sql {
  return cursor === null ? Prisma.empty : Prisma.sql`WHERE ${olderThan(cursor)}`;
}

function nextCursor(rows: ReadonlyArray<{ id: string; created_at: Date }>): string | null {
  if (rows.length <= MESSAGES_PER_PAGE) return null;
  const last = rows[MESSAGES_PER_PAGE - 1];
  return encodeCursor({ createdAt: last.created_at, id: last.id });
}

async function messageablePeer(tx: PrismaTx, actorId: string, recipientId: string): Promise<string | null> {
  const recipient = await tx.student.findUnique({ where: { id: recipientId }, select: { id: true, removedAt: true } });
  if (recipient === null || recipient.id === actorId || recipient.removedAt !== null) return null;
  const block = await tx.block.findFirst({ where: blockPair(actorId, recipient.id), select: { id: true } });
  return block === null ? recipient.id : null;
}

@Injectable()
export class MessagingService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly publisher: RealtimePublisher,
  ) {}

  send(actor: Actor, recipientId: string, body: string): Promise<DirectMessageView> {
    return this.uow.run('dm-send', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const peerId = await messageablePeer(tx, actor.studentId, recipientId);
      if (peerId === null) throw dmUnavailable();
      const text = body.trim();
      await ctx.checkpoint('dm-send');
      const created = await tx.directMessage.create({
        data: { senderId: actor.studentId, recipientId: peerId, body: text },
        select: { id: true, createdAt: true },
      });
      const message: DirectMessageView = {
        id: created.id,
        senderId: actor.studentId,
        recipientId: peerId,
        body: text,
        createdAt: created.createdAt.toISOString(),
      };
      ctx.afterCommit(() => this.publisher.dmMessage(message.senderId, message.recipientId, message));
      return message;
    });
  }

  typingPeer(actor: Actor, recipientId: string): Promise<string | null> {
    return this.uow.readOnly(async (tx) => {
      try {
        await readActiveActor(tx, actor.studentId);
      } catch (err) {
        if (err instanceof ApiError) return null;
        throw err;
      }
      return messageablePeer(tx, actor.studentId, recipientId);
    });
  }

  listThreads(actor: Actor, cursor: Cursor | null): Promise<ThreadPage> {
    return this.uow.readOnly(async (tx) => {
      const rows = await tx.$queryRaw<Array<ThreadRow>>`
        SELECT "peer_id", "id", "sender_id", "recipient_id", "body", "created_at"
          FROM (
            SELECT DISTINCT ON ("peer_id")
                   CASE WHEN "sender_id" = ${actor.studentId}::uuid
                        THEN "recipient_id" ELSE "sender_id" END AS "peer_id",
                   "id", "sender_id", "recipient_id", "body", "created_at"
              FROM "DirectMessage"
             WHERE "sender_id" = ${actor.studentId}::uuid OR "recipient_id" = ${actor.studentId}::uuid
             ORDER BY "peer_id", "created_at" DESC, "id" DESC
          ) AS "threads"
         ${whereOlderThan(cursor)}
         ORDER BY "created_at" DESC, "id" DESC
         LIMIT ${MESSAGES_PER_PAGE + 1}`;
      const peerIds = rows.slice(0, MESSAGES_PER_PAGE).map((row) => row.peer_id);
      const studentsById = new Map(
        (
          await tx.student.findMany({ where: { id: { in: peerIds } }, select: STUDENT_REF_SELECT })
        ).map((student) => [student.id, student]),
      );
      const unreadBySender = new Map(
        (
          await tx.directMessage.groupBy({
            by: ['senderId'],
            where: { ...unreadMessagesWhere(actor.studentId), senderId: { in: peerIds } },
            _count: { _all: true },
          })
        ).map((group) => [group.senderId, group._count._all]),
      );
      const blockedPeers = new Set(
        (
          await tx.block.findMany({
            where: {
              OR: peerIds.flatMap((peerId) => [
                { blockerId: actor.studentId, blockedId: peerId },
                { blockerId: peerId, blockedId: actor.studentId },
              ]),
            },
            select: { blockerId: true, blockedId: true },
          })
        ).map((row) => (row.blockerId === actor.studentId ? row.blockedId : row.blockerId)),
      );
      const items: ThreadView[] = [];
      for (const row of rows) {
        if (items.length === MESSAGES_PER_PAGE) break;
        const student = studentsById.get(row.peer_id);
        if (student === undefined) throw new ApiError('internal_error');
        const peer = toStudentRef(student);
        items.push({
          peer,
          lastMessage: toMessageView(row),
          unreadCount: unreadBySender.get(row.peer_id) ?? 0,
          canSend: !peer.removed && !blockedPeers.has(row.peer_id),
        });
      }
      return { items, nextCursor: nextCursor(rows) };
    });
  }

  readThread(actor: Actor, peerId: string, cursor: Cursor | null): Promise<PeerThread> {
    return this.uow.readOnly(async (tx) => {
      const peerRow = await tx.student.findUnique({ where: { id: peerId }, select: STUDENT_REF_SELECT });
      if (peerRow === null || peerRow.id === actor.studentId) throw new ApiError('not_found');
      const peer = toStudentRef(peerRow);
      const blockCount = await tx.block.count({ where: blockPair(actor.studentId, peerRow.id) });
      const rows = await tx.$queryRaw<Array<MessageRow>>`
        SELECT "id", "sender_id", "recipient_id", "body", "created_at"
          FROM "DirectMessage"
         WHERE (("sender_id" = ${actor.studentId}::uuid AND "recipient_id" = ${peerRow.id}::uuid)
             OR ("sender_id" = ${peerRow.id}::uuid AND "recipient_id" = ${actor.studentId}::uuid))
           ${andOlderThan(cursor)}
         ORDER BY "created_at" DESC, "id" DESC
         LIMIT ${MESSAGES_PER_PAGE + 1}`;
      return {
        peer,
        canSend: !peer.removed && blockCount === 0,
        items: rows.slice(0, MESSAGES_PER_PAGE).map(toMessageView),
        nextCursor: nextCursor(rows),
      };
    });
  }

  markThreadRead(actor: Actor, peerId: string): Promise<{ updated: number }> {
    return this.uow.run('dm-mark-read', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const peer = await tx.student.findUnique({ where: { id: peerId }, select: { id: true } });
      if (peer === null || peer.id === actor.studentId) throw new ApiError('not_found');
      await ctx.checkpoint('dm-mark-read');
      const { count } = await tx.directMessage.updateMany({
        where: { recipientId: actor.studentId, senderId: peer.id, readAt: null },
        data: { readAt: ctx.now },
      });
      if (count > 0) ctx.afterCommit(() => this.publisher.newDotsChanged({ studentId: actor.studentId }));
      return { updated: count };
    });
  }
}
