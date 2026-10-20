import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { blockPair } from '../core/block-pair';
import { ApiError } from '../core/errors';
import { PresenceReader } from '../core/presence-reader';
import { PrismaService } from '../core/prisma.service';
import { UnitOfWork } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { readActiveActor } from '../students/profile-writes';
import { STUDENT_REF_SELECT, toStudentRef } from '../students/student-ref';
import { acceptedFriendsOf } from './accepted-friends';
import {
  ALREADY_BLOCKED,
  FRIENDSHIP_EXISTS,
  friendRequestUnavailable,
  friendshipExists,
  notBlocked,
  notFriends,
  requestNotPending,
  selfActionForbidden,
  studentRemoved,
} from './refusals';
import type { BlockView, FriendRequestLists, FriendRequestView, FriendView } from './views';

// §3.4's `social` module: `Friendship` and `Block`. A write method takes an
// Actor and runs in exactly one `uow.run`; a read method runs outside the
// Unit of Work.

// The pair's rows in either direction: a Friendship is unique per unordered
// pair, and a Block counts whichever Student set it (§4.3.6, §4.3.7).
function friendshipPair(a: string, b: string): Prisma.FriendshipWhereInput {
  return {
    OR: [
      { requesterId: a, addresseeId: b },
      { requesterId: b, addresseeId: a },
    ],
  };
}

// A Block row with the blocked Student's StudentRef fields (§6.0.1): never an
// email.
const BLOCK_SELECT = {
  createdAt: true,
  blocked: { select: STUDENT_REF_SELECT },
} as const satisfies Prisma.BlockSelect;

type BlockRow = Prisma.BlockGetPayload<{ select: typeof BLOCK_SELECT }>;

function toBlockView(row: BlockRow): BlockView {
  return { student: toStudentRef(row.blocked), createdAt: row.createdAt.toISOString() };
}

// A pending request with both parties' StudentRef fields; the view keeps the
// other party's.
const REQUEST_SELECT = {
  id: true,
  createdAt: true,
  requester: { select: STUDENT_REF_SELECT },
  addressee: { select: STUDENT_REF_SELECT },
} as const satisfies Prisma.FriendshipSelect;

const REQUEST_ORDER = [
  { createdAt: 'desc' },
  { id: 'desc' },
] as const satisfies Prisma.FriendshipOrderByWithRelationInput[];

type RequestRow = Prisma.FriendshipGetPayload<{ select: typeof REQUEST_SELECT }>;

function toRequestView(row: RequestRow, other: RequestRow['requester']): FriendRequestView {
  return { id: row.id, student: toStudentRef(other), createdAt: row.createdAt.toISOString() };
}

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uow: UnitOfWork,
    private readonly presence: PresenceReader,
  ) {}

  // §6.4's `GET /api/friends`: the actor's accepted Friends, Removed excluded
  // (§11.1), by display name, with `online` from the Presence registry
  // (§7.6). Only the owner reads the list (§4.6). Read through `Student`, so
  // the names sort with the column's own collation (§4.4 step 9).
  async listFriends(actor: Actor): Promise<{ items: FriendView[] }> {
    const rows = await this.prisma.student.findMany({
      where: acceptedFriendsOf(actor.studentId),
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      select: STUDENT_REF_SELECT,
    });
    return {
      items: rows.map((row) => ({ student: toStudentRef(row), online: this.presence.isOnline(row.id) })),
    };
  }

  // §6.4's `GET /api/friends/requests`: the actor's pending requests, each
  // with the other party, newest first, Removed counterparts excluded
  // (§11.1). Only the two parties read a request (§4.6). The two lists are
  // two reads; `readOnly` keeps them one snapshot (§3.6.2), so a pair never
  // shows on both sides at once.
  async listRequests(actor: Actor): Promise<FriendRequestLists> {
    return this.uow.readOnly(async (tx) => {
      const incoming = await tx.friendship.findMany({
        where: { addresseeId: actor.studentId, status: 'PENDING', requester: { removedAt: null } },
        orderBy: REQUEST_ORDER,
        select: REQUEST_SELECT,
      });
      const outgoing = await tx.friendship.findMany({
        where: { requesterId: actor.studentId, status: 'PENDING', addressee: { removedAt: null } },
        orderBy: REQUEST_ORDER,
        select: REQUEST_SELECT,
      });
      return {
        incoming: incoming.map((row) => toRequestView(row, row.requester)),
        outgoing: outgoing.map((row) => toRequestView(row, row.addressee)),
      };
    });
  }

  // §6.4's `POST /api/friends/requests`, §11.1, §11.2. Reads the target, the
  // pair's Blocks and the pair's Friendship rows inside the SSI transaction.
  // Against a Block there is one serial order (§3.6.3): Block first, this
  // reads it and is refused; this first, the Block deletes the row. Against
  // the opposite request, `friendship_unordered_pair` admits one row.
  async requestFriend(actor: Actor, studentId: string): Promise<FriendRequestView> {
    return this.uow.run(
      { name: 'friend-request', uniqueRefusals: { friendship_unordered_pair: FRIENDSHIP_EXISTS } },
      async (tx, ctx) => {
        await readActiveActor(tx, actor.studentId);
        const target = await tx.student.findUnique({ where: { id: studentId }, select: STUDENT_REF_SELECT });
        if (target === null) throw new ApiError('not_found');
        // The row's id is the database's lower-case form, so the actor's own
        // id sent in upper case is still refused.
        if (target.id === actor.studentId) throw selfActionForbidden();
        if (target.removedAt !== null) throw studentRemoved();
        const block = await tx.block.findFirst({ where: blockPair(actor.studentId, target.id), select: { id: true } });
        if (block !== null) throw friendRequestUnavailable();
        const existing = await tx.friendship.findFirst({
          where: friendshipPair(actor.studentId, target.id),
          select: { id: true },
        });
        if (existing !== null) throw friendshipExists();
        await ctx.checkpoint('friend-request');
        const created = await tx.friendship.create({
          data: { requesterId: actor.studentId, addresseeId: target.id, status: 'PENDING' },
          select: { id: true, createdAt: true },
        });
        return { id: created.id, student: toStudentRef(target), createdAt: created.createdAt.toISOString() };
      },
    );
  }

  // §6.4's `POST /api/friends/requests/:id/accept`: only the addressee, only
  // while pending; the requester must not be Removed and no Block may stand
  // between them. `online` is read after the commit: the Unit of Work's work
  // does database work only.
  async acceptFriend(actor: Actor, requestId: string): Promise<FriendView> {
    const requester = await this.uow.run('friend-accept', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const row = await tx.friendship.findUnique({
        where: { id: requestId },
        select: { addresseeId: true, status: true, requester: { select: STUDENT_REF_SELECT } },
      });
      if (row === null || row.addresseeId !== actor.studentId || row.status !== 'PENDING') {
        throw requestNotPending();
      }
      if (row.requester.removedAt !== null) throw friendRequestUnavailable();
      const block = await tx.block.findFirst({
        where: blockPair(actor.studentId, row.requester.id),
        select: { id: true },
      });
      if (block !== null) throw friendRequestUnavailable();
      await ctx.checkpoint('friend-accept');
      await tx.friendship.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED', respondedAt: ctx.now },
      });
      return row.requester;
    });
    return { student: toStudentRef(requester), online: this.presence.isOnline(requester.id) };
  }

  // §6.4's `POST /api/friends/requests/:id/decline`: the addressee deletes a
  // pending request. Nobody is told (no event).
  async declineFriend(actor: Actor, requestId: string): Promise<Record<string, never>> {
    await this.uow.run('friend-decline', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      await ctx.checkpoint('friend-decline');
      const { count } = await tx.friendship.deleteMany({
        where: { id: requestId, addresseeId: actor.studentId, status: 'PENDING' },
      });
      if (count === 0) throw requestNotPending();
    });
    return {};
  }

  // §6.4's `DELETE /api/friends/requests/:id`: the requester cancels a
  // pending request.
  async cancelFriend(actor: Actor, requestId: string): Promise<Record<string, never>> {
    await this.uow.run('friend-cancel', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      await ctx.checkpoint('friend-cancel');
      const { count } = await tx.friendship.deleteMany({
        where: { id: requestId, requesterId: actor.studentId, status: 'PENDING' },
      });
      if (count === 0) throw requestNotPending();
    });
    return {};
  }

  // §6.4's `DELETE /api/friends/:studentId`: either party ends an accepted
  // Friendship, a hard delete. A pending request is not a Friendship, so it
  // answers `not_friends` like none at all.
  async endFriendship(actor: Actor, studentId: string): Promise<Record<string, never>> {
    await this.uow.run('friendship-end', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      await ctx.checkpoint('friendship-end');
      const { count } = await tx.friendship.deleteMany({
        where: { status: 'ACCEPTED', ...friendshipPair(actor.studentId, studentId) },
      });
      if (count === 0) throw notFriends();
    });
    return {};
  }

  // §6.4's `GET /api/blocks`: the actor's own Blocks, newest first. Only the
  // blocker reads them: no route shows a Block to anyone else, Admins
  // included (§4.6).
  async listBlocks(actor: Actor): Promise<{ items: BlockView[] }> {
    const rows = await this.prisma.block.findMany({
      where: { blockerId: actor.studentId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: BLOCK_SELECT,
    });
    return { items: rows.map(toBlockView) };
  }

  // §6.4's `POST /api/blocks`, §11.2. The target and the pair's Friendship
  // rows are read inside the SSI transaction, and the unique index refuses a
  // second Block of the same Student. The pair's Friendship row, pending or
  // accepted, is deleted in the same transaction, so a Block and a Friendship
  // row never coexist at any commit (§3.6.3). A Match in progress is untouched
  // (ADR-0006 d10), no session changes and nobody is notified, so there is no
  // event.
  async block(actor: Actor, studentId: string): Promise<BlockView> {
    return this.uow.run(
      { name: 'block-create', uniqueRefusals: { Block_blocker_id_blocked_id_key: ALREADY_BLOCKED } },
      async (tx, ctx) => {
        await readActiveActor(tx, actor.studentId);
        const target = await tx.student.findUnique({ where: { id: studentId }, select: STUDENT_REF_SELECT });
        if (target === null) throw new ApiError('not_found');
        // The row's id is the database's lower-case form, so the actor's own
        // id sent in upper case is still refused.
        if (target.id === actor.studentId) throw selfActionForbidden();
        if (target.removedAt !== null) throw studentRemoved();
        const friendship = await tx.friendship.findFirst({
          where: friendshipPair(actor.studentId, target.id),
          select: { id: true },
        });
        await ctx.checkpoint('block-create');
        const created = await tx.block.create({
          data: { blockerId: actor.studentId, blockedId: target.id },
          select: { createdAt: true },
        });
        if (friendship !== null) await tx.friendship.delete({ where: { id: friendship.id } });
        return { student: toStudentRef(target), createdAt: created.createdAt.toISOString() };
      },
    );
  }

  // §6.4's `DELETE /api/blocks/:studentId`, §11.3: deletes only the actor's
  // own Block and restores nothing. A Block the other Student set on the
  // actor still applies.
  async unblock(actor: Actor, studentId: string): Promise<Record<string, never>> {
    await this.uow.run('block-lift', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      await ctx.checkpoint('block-lift');
      const { count } = await tx.block.deleteMany({
        where: { blockerId: actor.studentId, blockedId: studentId },
      });
      if (count === 0) throw notBlocked();
    });
    return {};
  }
}
