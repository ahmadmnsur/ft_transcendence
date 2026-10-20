import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { useHarness } from '../harness/app';
import { createTestAccount } from '../harness/accounts';

const harness = useHarness();

// The SQLSTATE and message a failed raw statement reports, whichever layer of
// the driver carries them. The driver adapter keeps a constraint's name only
// for unique and foreign-key violations, so a CHECK is named by the message.
function violation(err: unknown): { code?: string; message?: string } {
  const e = err as {
    code?: string;
    message?: string;
    cause?: unknown;
    meta?: { driverAdapterError?: { cause?: { originalCode?: string; originalMessage?: string } } };
  };
  const cause = e.meta?.driverAdapterError?.cause;
  if (cause !== undefined) return { code: cause.originalCode, message: cause.originalMessage };
  if (e.cause !== undefined) return violation(e.cause);
  return { code: e.code, message: e.message };
}

type Origins = { authorId: string; promptId: string; reviewId: string; roundId: string };

// Both origins a Post can have: a Prompt, and the Review of a Match in an open
// Round. The Match's Mentee writes the Posts.
async function makeOrigins(): Promise<Origins> {
  const prisma = harness.app.get(PrismaService);
  const mentor = await createTestAccount(harness.app);
  const mentee = await createTestAccount(harness.app);
  const [round] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "Round" (id) VALUES (gen_random_uuid()) RETURNING id::text`,
  );
  const [match] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "Match" (id, round_id, mentor_id, mentee_id, status, mission, goal_bonus_applied)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, 'COMPLETED', 'ADVICE', false)
       RETURNING id::text`,
    round.id,
    mentor.id,
    mentee.id,
  );
  const [review] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "Review" (id, match_id, learned, can_now_do)
       VALUES (gen_random_uuid(), $1::uuid, 'How a B-tree splits.', 'Read an index plan.')
       RETURNING id::text`,
    match.id,
  );
  const [prompt] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "ReflectionPrompt" (id, question, publication_order)
       VALUES (gen_random_uuid(), 'What did you explain this week?', 1)
       RETURNING id::text`,
  );
  return { authorId: mentee.id, promptId: prompt.id, reviewId: review.id, roundId: round.id };
}

// Inserts one Post with these three nullable columns; a null leaves one unset.
// Resolves to the error the insert failed with, or undefined.
function insertPost(
  authorId: string,
  columns: { promptId: string | null; reviewId: string | null; answerRoundId: string | null },
): Promise<unknown> {
  return harness.app
    .get(PrismaService)
    .$executeRawUnsafe(
      `INSERT INTO "Post" (id, author_id, body, prompt_id, review_id, answer_round_id)
         VALUES (gen_random_uuid(), $1::uuid, 'A body.', $2::uuid, $3::uuid, $4::uuid)`,
      authorId,
      columns.promptId,
      columns.reviewId,
      columns.answerRoundId,
    )
    .then(
      () => undefined,
      (e: unknown) => e,
    );
}

// §4.4 step 1, §16.3 row 2. Prisma does not represent the CHECK, so a
// migration that loses it lets a Post carry both origins, or neither, and
// nothing says so.
describe('post origins migration', () => {
  it('creates post_exactly_one_origin as a CHECK that exactly one origin is set', async () => {
    const rows = await harness.app
      .get(PrismaService)
      .$queryRawUnsafe<Array<{ definition: string }>>(
        `SELECT pg_get_constraintdef(c.oid) AS definition
           FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           JOIN pg_namespace n ON n.oid = t.relnamespace
          WHERE n.nspname = 'public' AND t.relname = 'Post'
            AND c.conname = 'post_exactly_one_origin' AND c.contype = 'c'`,
      );
    expect(rows).toEqual([{ definition: 'CHECK (((prompt_id IS NULL) <> (review_id IS NULL)))' }]);
  });

  it('admits a Post with one origin, on either arm', async () => {
    const o = await makeOrigins();
    const promptArm = { promptId: o.promptId, reviewId: null, answerRoundId: o.roundId };
    const takeawayArm = { promptId: null, reviewId: o.reviewId, answerRoundId: null };
    expect(await insertPost(o.authorId, promptArm)).toBe(undefined);
    expect(await insertPost(o.authorId, takeawayArm)).toBe(undefined);
    expect(await harness.app.get(PrismaService).post.count()).toBe(2);
  });

  it('rejects a Post with neither origin, and one with both', async () => {
    const o = await makeOrigins();
    for (const columns of [
      { promptId: null, reviewId: null, answerRoundId: null },
      { promptId: o.promptId, reviewId: o.reviewId, answerRoundId: o.roundId },
    ]) {
      expect(violation(await insertPost(o.authorId, columns))).toEqual({
        code: '23514',
        message: 'new row for relation "Post" violates check constraint "post_exactly_one_origin"',
      });
    }
    expect(await harness.app.get(PrismaService).post.count()).toBe(0);
  });
});
