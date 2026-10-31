import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { ModerationService } from '../../src/moderation/moderation.service';
import { createTestAccount } from '../harness/accounts';
import { useHarness } from '../harness/app';

const harness = useHarness();

async function makePost(authorId: string): Promise<string> {
  const prisma = harness.app.get(PrismaService);
  const [prompt] = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "ReflectionPrompt" (id, question, publication_order)
    VALUES (gen_random_uuid(), 'What did you learn?', 1) RETURNING id::text`;
  const [post] = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "Post" (id, author_id, body, prompt_id)
    VALUES (gen_random_uuid(), ${authorId}::uuid, 'Read an index plan.', ${prompt.id}::uuid)
    RETURNING id::text`;
  return post.id;
}

async function outcome(work: Promise<unknown>): Promise<string> {
  try {
    await work;
    return 'ok';
  } catch (err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    throw err;
  }
}

describe('report filing', () => {
  it.each(['Post', 'Student'] as const)('keeps one unchanged Report when two filings race on a %s', async (kind) => {
    const prisma = harness.app.get(PrismaService);
    const moderation = harness.app.get(ModerationService);
    const reporter = await createTestAccount(harness.app);
    const student = await createTestAccount(harness.app);
    const target = kind === 'Post' ? { postId: await makePost(student.id) } : { studentId: student.id };
    const actor = { studentId: reporter.id, sessionHash: null };
    const createdAt = new Date('2026-10-22T10:00:00.000Z');
    harness.clock.stopAt(createdAt);
    harness.barriers.arm('report.file');
    const first = outcome(moderation.file(actor, { target, reason: 'HARASSMENT', text: 'First testimony.' }));
    await harness.barriers.waitFor('report.file', 1);
    harness.clock.stopAt(new Date('2026-10-22T10:00:01.000Z'));
    const second = outcome(moderation.file(actor, { target, reason: 'SPAM', text: 'Second testimony.' }));
    await harness.barriers.waitFor('report.file', 2);
    harness.barriers.disarm('report.file');
    harness.barriers.release('report.file');
    expect(await first).toBe('ok');
    const winner = await prisma.report.findFirstOrThrow();
    expect(winner).toMatchObject({
      reporterId: reporter.id,
      postId: 'postId' in target ? target.postId : null,
      reportedStudentId: 'studentId' in target ? target.studentId : null,
      reason: 'HARASSMENT',
      text: 'First testimony.',
      state: 'OPEN',
      createdAt,
    });
    harness.barriers.release('report.file');
    expect(await second).toBe('already_reported');
    expect(await prisma.report.findMany()).toEqual([winner]);
  });

  it('refuses a second HTTP filing after dismissal because the slot lasts forever', async () => {
    const prisma = harness.app.get(PrismaService);
    const reporter = await createTestAccount(harness.app);
    const student = await createTestAccount(harness.app);
    const postId = await makePost(student.id);
    const first = await harness.post('/api/reports').set('Cookie', reporter.cookie)
      .send({ postId, reason: 'OTHER', text: 'Original testimony.' }).expect(200);
    expect(first.body).toEqual({ ok: true, data: { received: true } });
    await prisma.$executeRaw`
      UPDATE "Report" SET state = 'DISMISSED', resolved_by_id = ${student.id}::uuid,
      resolved_at = CURRENT_TIMESTAMP WHERE reporter_id = ${reporter.id}::uuid`;
    const dismissed = await prisma.report.findFirstOrThrow();
    const second = await harness.post('/api/reports').set('Cookie', reporter.cookie)
      .send({ postId, reason: 'SPAM', text: 'Changed testimony.' }).expect(200);
    expect(second.body).toMatchObject({ ok: false, error: { code: 'already_reported' } });
    expect(await prisma.report.findMany()).toEqual([dismissed]);
  });
});
