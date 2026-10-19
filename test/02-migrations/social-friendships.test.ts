import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { useHarness } from '../harness/app';
import { createTestAccount } from '../harness/accounts';

const harness = useHarness();

// The SQLSTATE and constraint a failed raw statement reports, whichever layer
// of the driver carries them.
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

// §4.4 step 6, §16.3 row 2: one Friendship per unordered pair. Prisma does
// not represent the index, so a migration that loses it lets a pair hold two
// rows, one each way, and nothing says so.
describe('social friendships migration', () => {
  it('creates friendship_unordered_pair as a unique index over the unordered pair', async () => {
    const rows = await harness.app
      .get(PrismaService)
      .$queryRawUnsafe<Array<{ indexdef: string }>>(
        `SELECT indexdef FROM pg_indexes
          WHERE schemaname = 'public' AND tablename = 'Friendship'
            AND indexname = 'friendship_unordered_pair'`,
      );
    expect(rows).toEqual([
      {
        indexdef:
          'CREATE UNIQUE INDEX friendship_unordered_pair ON public."Friendship" USING btree (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))',
      },
    ]);
  });

  it('rejects the reversed duplicate of a pair', async () => {
    const prisma = harness.app.get(PrismaService);
    const a = await createTestAccount(harness.app);
    const b = await createTestAccount(harness.app);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Friendship" (id, requester_id, addressee_id, status)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'PENDING')`,
      a.id,
      b.id,
    );

    const reversed = prisma.$executeRawUnsafe(
      `INSERT INTO "Friendship" (id, requester_id, addressee_id, status)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'PENDING')`,
      b.id,
      a.id,
    );
    const err = await reversed.then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(violation(err)).toEqual({ code: '23505', constraint: 'friendship_unordered_pair' });
    expect(await prisma.friendship.count()).toBe(1);
  });
});
