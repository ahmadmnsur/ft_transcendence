import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { useHarness } from '../harness/app';
import { createTestAccount } from '../harness/accounts';

const harness = useHarness();

function violation(err: unknown): { code?: string; constraint?: string } {
  const e = err as {
    code?: string;
    constraint?: string;
    cause?: unknown;
    meta?: { driverAdapterError?: { cause?: { originalCode?: string; constraint?: { index?: string } } } };
  };
  const cause = e.meta?.driverAdapterError?.cause;
  if (cause !== undefined) return { code: cause.originalCode, constraint: cause.constraint?.index };
  if (e.cause !== undefined) return violation(e.cause);
  return { code: e.code, constraint: e.constraint };
}

async function indexDefinition(table: string, name: string): Promise<Array<{ indexdef: string }>> {
  return harness.app
    .get(PrismaService)
    .$queryRawUnsafe<Array<{ indexdef: string }>>(
      `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`,
      table,
      name,
    );
}

async function insertRound(closed: boolean): Promise<string> {
  const rows = await harness.app
    .get(PrismaService)
    .$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "Round" (id, closed_at) VALUES (gen_random_uuid(), ${closed ? 'now()' : 'NULL'}) RETURNING id::text`,
    );
  return rows[0].id;
}

describe('rounds and matches migration', () => {
  it('creates round_single_open as a unique index over the open Rounds only', async () => {
    expect(await indexDefinition('Round', 'round_single_open')).toEqual([
      {
        indexdef:
          'CREATE UNIQUE INDEX round_single_open ON public."Round" USING btree (((closed_at IS NULL))) WHERE (closed_at IS NULL)',
      },
    ]);
  });

  it('rejects a second open Round, while closed Rounds stay unlimited', async () => {
    await insertRound(true);
    await insertRound(true);
    await insertRound(false);

    const second = insertRound(false).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(violation(await second)).toEqual({ code: '23505', constraint: 'round_single_open' });
    expect(await harness.app.get(PrismaService).round.count({ where: { closedAt: null } })).toBe(1);
    expect(await harness.app.get(PrismaService).round.count()).toBe(3);
  });

  it('creates match_pair_history as a NON-unique index over the unordered pair', async () => {
    expect(await indexDefinition('Match', 'match_pair_history')).toEqual([
      {
        indexdef:
          'CREATE INDEX match_pair_history ON public."Match" USING btree (LEAST(mentor_id, mentee_id), GREATEST(mentor_id, mentee_id))',
      },
    ]);
  });

  it('admits the same pair twice, either way round, as a hand-made Match may repeat one', async () => {
    const prisma = harness.app.get(PrismaService);
    const a = await createTestAccount(harness.app);
    const b = await createTestAccount(harness.app);
    const roundId = await insertRound(false);
    for (const [mentor, mentee] of [
      [a.id, b.id],
      [b.id, a.id],
      [a.id, b.id],
    ]) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Match" (id, round_id, mentor_id, mentee_id, mission, goal_bonus_applied)
           VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, 'ADVICE', false)`,
        roundId,
        mentor,
        mentee,
      );
    }
    expect(await prisma.match.count()).toBe(3);
  });
});
