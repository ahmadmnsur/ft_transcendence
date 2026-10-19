import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { useHarness } from '../harness/app';

const harness = useHarness();

// §4.4 step 9, §16.3 row 2: `Student.display_name` carries the `und-x-icu`
// collation, so every stack sorts names alike. Each migration's other raw
// objects are asserted in a file of their own, beside this one.
describe('accounts and sessions migration', () => {
  it('gives Student.display_name the und-x-icu collation', async () => {
    const rows = await harness.app
      .get(PrismaService)
      .$queryRawUnsafe<Array<{ collname: string }>>(
        `SELECT c.collname
           FROM pg_attribute a
           JOIN pg_class t ON t.oid = a.attrelid
           JOIN pg_collation c ON c.oid = a.attcollation
          WHERE t.relname = 'Student' AND a.attname = 'display_name'`,
      );
    expect(rows).toEqual([{ collname: 'und-x-icu' }]);
  });
});
