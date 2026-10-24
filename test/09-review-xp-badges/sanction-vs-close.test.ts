import { describe, expect, it } from 'vitest';
import { AdminUsersService } from '../../src/admin/admin-users.service';
import { PrismaService } from '../../src/core/prisma.service';
import { UnitOfWork } from '../../src/core/uow';
import { MatchingService } from '../../src/matching/matching.service';
import { PromptsService } from '../../src/prompts/prompts.service';
import { createTestAccount, createTestStaff } from '../harness/accounts';
import { useHarness } from '../harness/app';

const harness = useHarness();
const actor = (studentId: string) => ({ studentId, sessionHash: null });

function settle(work: Promise<unknown>): Promise<string> {
  return work.then(
    () => 'ok',
    (error: { code?: unknown }) => {
      if (typeof error.code === 'string') return error.code;
      throw error;
    },
  );
}

// §3.6.3 *Sanction vs Round close* (ADR-0010 d4; ADR-0008 d5's note of
// 2026-09-22), §16.3 row 9: both write the Student row, so they have one
// serial order. Sanction first, the close skips the Student, Streak and
// Consistent Learner alike, though the Round holds their qualifying answer.
// Close first, the Streak and the Badge it gave survive the sanction.
describe.each(['suspend', 'remove'] as const)('%s against Round close, with prior qualifying activity', (kind) => {
  it.each(['sanction', 'close'] as const)('%s released first', async (first) => {
    const admin = actor((await createTestStaff(harness.app, 'ADMIN')).id);
    const student = await createTestAccount(harness.app);
    await harness.app.get(UnitOfWork).run('fixture-streak', async (tx) => {
      await tx.student.update({ where: { id: student.id }, data: { streak: 2 } });
    });
    const matching = harness.app.get(MatchingService);
    const prompts = harness.app.get(PromptsService);
    await matching.openRound(admin);
    const prompt = await prompts.publish(admin, 'What did this Round teach you?');
    await prompts.answer(actor(student.id), prompt.id, 'A lesson from the Round.');
    const users = harness.app.get(AdminUsersService);
    const checkpoint = `student.${kind}`;

    harness.barriers.arm(checkpoint);
    harness.barriers.arm('round.close');
    const sanctioned = settle(kind === 'suspend' ? users.suspend(admin, student.id) : users.remove(admin, student.id));
    const closed = settle(matching.closeRound(admin));
    await harness.barriers.waitFor(checkpoint, 1);
    await harness.barriers.waitFor('round.close', 1);
    harness.barriers.disarm(checkpoint);
    harness.barriers.disarm('round.close');
    harness.barriers.release(first === 'sanction' ? checkpoint : 'round.close');
    expect(await (first === 'sanction' ? sanctioned : closed)).toBe('ok');
    harness.barriers.release(first === 'sanction' ? 'round.close' : checkpoint);
    expect([await sanctioned, await closed]).toEqual(['ok', 'ok']);

    const prisma = harness.app.get(PrismaService);
    const row = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(kind === 'suspend' ? row.suspendedAt : row.removedAt).not.toBeNull();
    expect(row.streak).toBe(first === 'sanction' ? 2 : 3);
    expect(await prisma.badgeAward.findMany({ where: { studentId: student.id }, select: { badge: true } })).toEqual(
      first === 'sanction' ? [] : [{ badge: 'CONSISTENT_LEARNER' }],
    );
    // The answer and its XP stay either way.
    expect(row.xp).toBe(20);
  });
});
