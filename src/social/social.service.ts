import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { PrismaService } from '../core/prisma.service';
import { UnitOfWork } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { readActiveActor } from '../students/profile-writes';
import { STUDENT_REF_SELECT, toStudentRef } from '../students/student-ref';
import { ALREADY_BLOCKED, notBlocked, selfActionForbidden, studentRemoved } from './refusals';
import type { BlockView } from './views';

// §3.4's `social` module: `Block`, and `Friendship` once #46 adds it. A write
// method takes an Actor and runs in exactly one `uow.run`; a read method runs
// outside the Unit of Work.

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

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uow: UnitOfWork,
  ) {}

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

  // §6.4's `POST /api/blocks`, §11.2. The target is read inside the SSI
  // transaction, and the unique index refuses a second Block of the same
  // Student. A Match in progress is untouched (ADR-0006 d10), no session
  // changes and nobody is notified, so there is no event. Deleting the pair's
  // Friendship row joins this transaction with #46.
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
        await ctx.checkpoint('block-create');
        const created = await tx.block.create({
          data: { blockerId: actor.studentId, blockedId: target.id },
          select: { createdAt: true },
        });
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
