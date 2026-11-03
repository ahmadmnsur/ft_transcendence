import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { blockPair } from '../core/block-pair';
import { ApiError } from '../core/errors';
import { PresenceReader } from '../core/presence-reader';
import { PrismaService } from '../core/prisma.service';
import { RealtimePublisher } from '../core/realtime-publisher';
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


function friendshipPair(a: string, b: string): Prisma.FriendshipWhereInput {
  return {
    OR: [
      { requesterId: a, addresseeId: b },
      { requesterId: b, addresseeId: a },
    ],
  };
}

const BLOCK_SELECT = {
  createdAt: true,
  blocked: { select: STUDENT_REF_SELECT },
} as const satisfies Prisma.BlockSelect;

type BlockRow = Prisma.BlockGetPayload<{ select: typeof BLOCK_SELECT }>;

function toBlockView(row: BlockRow): BlockView {
  return { student: toStudentRef(row.blocked), createdAt: row.createdAt.toISOString() };
}

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
    private readonly publisher: RealtimePublisher,
  ) {}

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

  async requestFriend(actor: Actor, studentId: string): Promise<FriendRequestView> {
    return this.uow.run(
      { name: 'friend-request', uniqueRefusals: { friendship_unordered_pair: FRIENDSHIP_EXISTS } },
      async (tx, ctx) => {
        await readActiveActor(tx, actor.studentId);
        const target = await tx.student.findUnique({ where: { id: studentId }, select: STUDENT_REF_SELECT });
        if (target === null) throw new ApiError('not_found');
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
        ctx.afterCommit(() => this.publisher.friendsChanged([actor.studentId, target.id]));
        return { id: created.id, student: toStudentRef(target), createdAt: created.createdAt.toISOString() };
      },
    );
  }

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
      ctx.afterCommit(() => this.publisher.friendsChanged([actor.studentId, row.requester.id]));
      return row.requester;
    });
    return { student: toStudentRef(requester), online: this.presence.isOnline(requester.id) };
  }

  async declineFriend(actor: Actor, requestId: string): Promise<Record<string, never>> {
    await this.uow.run('friend-decline', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const row = await tx.friendship.findFirst({
        where: { id: requestId, addresseeId: actor.studentId, status: 'PENDING' },
        select: { id: true, requesterId: true },
      });
      if (row === null) throw requestNotPending();
      await ctx.checkpoint('friend-decline');
      await tx.friendship.delete({ where: { id: row.id } });
      ctx.afterCommit(() => this.publisher.friendsChanged([actor.studentId, row.requesterId]));
    });
    return {};
  }

  async cancelFriend(actor: Actor, requestId: string): Promise<Record<string, never>> {
    await this.uow.run('friend-cancel', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const row = await tx.friendship.findFirst({
        where: { id: requestId, requesterId: actor.studentId, status: 'PENDING' },
        select: { id: true, addresseeId: true },
      });
      if (row === null) throw requestNotPending();
      await ctx.checkpoint('friend-cancel');
      await tx.friendship.delete({ where: { id: row.id } });
      ctx.afterCommit(() => this.publisher.friendsChanged([actor.studentId, row.addresseeId]));
    });
    return {};
  }

  async endFriendship(actor: Actor, studentId: string): Promise<Record<string, never>> {
    await this.uow.run('friendship-end', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const row = await tx.friendship.findFirst({
        where: { status: 'ACCEPTED', ...friendshipPair(actor.studentId, studentId) },
        select: { id: true, requesterId: true, addresseeId: true },
      });
      if (row === null) throw notFriends();
      await ctx.checkpoint('friendship-end');
      await tx.friendship.delete({ where: { id: row.id } });
      ctx.afterCommit(() => this.publisher.friendsChanged([row.requesterId, row.addresseeId]));
    });
    return {};
  }

  async listBlocks(actor: Actor): Promise<{ items: BlockView[] }> {
    const rows = await this.prisma.block.findMany({
      where: { blockerId: actor.studentId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: BLOCK_SELECT,
    });
    return { items: rows.map(toBlockView) };
  }

  async block(actor: Actor, studentId: string): Promise<BlockView> {
    return this.uow.run(
      { name: 'block-create', uniqueRefusals: { Block_blocker_id_blocked_id_key: ALREADY_BLOCKED } },
      async (tx, ctx) => {
        await readActiveActor(tx, actor.studentId);
        const target = await tx.student.findUnique({ where: { id: studentId }, select: STUDENT_REF_SELECT });
        if (target === null) throw new ApiError('not_found');
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
