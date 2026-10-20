import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { blockPair } from '../core/block-pair';
import { encodeCursor, type Cursor } from '../core/cursor';
import { ApiError } from '../core/errors';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork } from '../core/uow';
import { Prisma } from '../generated/prisma/client';
import { PAGING } from '../shared/limits';
import { readActiveActor } from '../students/profile-writes';
import { STUDENT_REF_SELECT, toStudentRef } from '../students/student-ref';
import { dmUnavailable } from './refusals';
import type { DirectMessageView, PeerThread, ThreadPage, ThreadView } from './views';

// §6.5 and §7.3's `messaging` module: the `DirectMessage` rows. The three HTTP
// routes are reads only (§6.5); the one write, a send, is the socket's
// `dm:send` (§7.3). A write method takes an Actor and runs in exactly one
// `uow.run`; a read runs in one `uow.readOnly`, so the page's several reads
// stay one snapshot (§3.6.2).

// §6.5: 50 rows per page, on the same cap Tables pages at (§6.0.1).
const MESSAGES_PER_PAGE = PAGING.maxPageSize;

// What `$queryRaw` returns for one message row: the pg adapter maps a uuid to
// a string and a timestamptz to a Date.
type MessageRow = { id: string; sender_id: string; recipient_id: string; body: string; created_at: Date };

type ThreadRow = MessageRow & { peer_id: string };

// Every listing carries these five fields and no more: no `read_at` (§11.4),
// whose only audience is the recipient it marks.
function toMessageView(row: MessageRow): DirectMessageView {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    createdAt: row.created_at.toISOString(),
  };
}

// §6.0.1's keyset: strictly after the last `(created_at, id)` the client
// already has, sent back as `?cursor` and decoded by the controller.
function olderThan(cursor: Cursor): Prisma.Sql {
  // The parens keep the OR whole, whatever ANDs the callers hang it into.
  return Prisma.sql`("created_at" < ${cursor.createdAt}::timestamptz
      OR ("created_at" = ${cursor.createdAt}::timestamptz AND "id" < ${cursor.id}::uuid))`;
}

function andOlderThan(cursor: Cursor | null): Prisma.Sql {
  return cursor === null ? Prisma.empty : Prisma.sql`AND ${olderThan(cursor)}`;
}

function whereOlderThan(cursor: Cursor | null): Prisma.Sql {
  return cursor === null ? Prisma.empty : Prisma.sql`WHERE ${olderThan(cursor)}`;
}

// The next cursor from the last row the page shows; there is one only when a
// probe row beyond the page came back (§6.0.1).
function nextCursor(rows: ReadonlyArray<{ id: string; created_at: Date }>): string | null {
  if (rows.length <= MESSAGES_PER_PAGE) return null;
  const last = rows[MESSAGES_PER_PAGE - 1];
  return encodeCursor({ createdAt: last.created_at, id: last.id });
}

@Injectable()
export class MessagingService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly publisher: RealtimePublisher,
  ) {}

  // §7.3: the write half of `dm:send`, one SSI transaction that reads the
  // actor (Active), the recipient (known, other, not Removed) and the pair's
  // Block rows (none in either direction), then inserts the row. All four
  // cases share the one refusal `dm_unavailable`, so a blocked Student is not
  // told who set the standing Block (§4.6, §11.2). The body is stored trimmed
  // (§6.0.3). After the commit: `dm:message` to the sender's and the
  // recipient's rooms (§7.4). The ack carries the sent message back to the
  // tab that sent it; the event reaches the sender's other tabs.
  send(actor: Actor, recipientId: string, body: string): Promise<DirectMessageView> {
    return this.uow.run('dm-send', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const recipient = await tx.student.findUnique({ where: { id: recipientId }, select: STUDENT_REF_SELECT });
      // The row's id is the database's lower-case form, so an id sent in
      // upper case resolves all the same.
      if (recipient === null || recipient.id === actor.studentId || recipient.removedAt !== null) {
        throw dmUnavailable();
      }
      const block = await tx.block.findFirst({
        where: blockPair(actor.studentId, recipient.id),
        select: { id: true },
      });
      if (block !== null) throw dmUnavailable();
      const text = body.trim();
      await ctx.checkpoint('dm-send');
      const created = await tx.directMessage.create({
        data: { senderId: actor.studentId, recipientId: recipient.id, body: text },
        select: { id: true, createdAt: true },
      });
      const message: DirectMessageView = {
        id: created.id,
        senderId: actor.studentId,
        recipientId: recipient.id,
        body: text,
        createdAt: created.createdAt.toISOString(),
      };
      ctx.afterCommit(() => this.publisher.dmMessage(message.senderId, message.recipientId, message));
      return message;
    });
  }

  // §6.5's `GET /api/messages/threads`: one row per other Student the actor
  // has ever exchanged a Direct Message with, newest activity first — the
  // pair's newest row in either direction, so a reply keeps a peer at the top.
  // 50 rows per page. Only the actor reads the list (§4.6).
  listThreads(actor: Actor, cursor: Cursor | null): Promise<ThreadPage> {
    return this.uow.readOnly(async (tx) => {
      // One row per other Student: `DISTINCT ON` keeps each pair's latest
      // row, the outer keyset applies `?cursor` to that latest row — not to
      // the older rows a page-boundary read could otherwise swallow — and the
      // outer order is the schema's tie-broken newest-activity-first.
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
      // The peers' refs in this page's snapshot. A person row is never
      // deleted (§4.3.8's FK), so a lookup that misses is the impossible
      // case `internal_error` stands for, not a 404.
      const studentsById = new Map(
        (
          await tx.student.findMany({ where: { id: { in: peerIds } }, select: STUDENT_REF_SELECT })
        ).map((student) => [student.id, student]),
      );
      // §6.5: the actor's unread count per peer, `read_at` null on rows sent
      // to the actor. Only this page's peers are counted; a sender off this
      // page has no row here to show a count against.
      const unreadBySender = new Map(
        (
          await tx.directMessage.groupBy({
            by: ['senderId'],
            where: { recipientId: actor.studentId, readAt: null, senderId: { in: peerIds } },
            _count: { _all: true },
          })
        ).map((group) => [group.senderId, group._count._all]),
      );
      // §6.5's `canSend`: no Block in either direction. Only this page's
      // peers are read; a Block elsewhere changes no row here.
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
        // §6.5: a Removed peer is not writable, and neither is a peer with a
        // Block between them, either way it stands (§11.2).
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

  // §6.5's `GET /api/messages/threads/:peerId`: the peer, `canSend`, and one
  // page of the pair's two directions interleaved, newest first. No side
  // effect: only `POST …/read` writes `read_at`, and separately (§6.5). An
  // unknown peer and the actor's own id are the same `not_found`: the actor
  // has no row with themselves.
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

  // §6.5's `POST /api/messages/threads/:peerId/read`: `read_at = now` on the
  // rows sent to the actor by this peer that nobody read yet — never on the
  // actor's own sent rows (ADR-0014 d6). A Block between them or a Removed
  // peer changes nothing; the actor's own inbox is still theirs. No event:
  // there is no read receipt to send anyone (§11.4). Against a concurrent
  // send there is exactly one serial order (§6.5): a message ordered first is
  // counted, one ordered after is not.
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
      return { updated: count };
    });
  }
}
