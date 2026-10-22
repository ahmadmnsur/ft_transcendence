import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { createTestAccount } from '../harness/accounts';
import { useHarness } from '../harness/app';

const harness = useHarness();

async function makeTargets(): Promise<{ reporterId: string; studentId: string; postId: string }> {
  const prisma = harness.app.get(PrismaService);
  const reporter = await createTestAccount(harness.app);
  const student = await createTestAccount(harness.app);
  const [prompt] = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "ReflectionPrompt" (id, question, publication_order)
    VALUES (gen_random_uuid(), 'What did you learn?', 1) RETURNING id::text`;
  const [post] = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "Post" (id, author_id, body, prompt_id)
    VALUES (gen_random_uuid(), ${student.id}::uuid, 'Read an index plan.', ${prompt.id}::uuid)
    RETURNING id::text`;
  return { reporterId: reporter.id, studentId: student.id, postId: post.id };
}

function insertReport(
  reporterId: string,
  postId: string | null,
  studentId: string | null,
  state = 'OPEN',
  resolvedById: string | null = null,
  resolvedAt: Date | null = null,
): Promise<number> {
  return harness.app.get(PrismaService).$executeRaw`
    INSERT INTO "Report" (id, reporter_id, post_id, reported_student_id, reason, state,
                          resolved_by_id, resolved_at)
    VALUES (gen_random_uuid(), ${reporterId}::uuid, ${postId}::uuid, ${studentId}::uuid,
            'OTHER', ${state}::"ReportState", ${resolvedById}::uuid, ${resolvedAt}::timestamptz)`;
}

// The adapter preserves the index name separately from the raw error message.
function uniqueViolation(err: unknown): { code?: string; constraint?: string } {
  const e = err as {
    code?: string;
    constraint?: string;
    cause?: unknown;
    meta?: { driverAdapterError?: { cause?: { originalCode?: string; constraint?: { index?: string } } } };
  };
  const cause = e.meta?.driverAdapterError?.cause;
  if (cause !== undefined) return { code: cause.originalCode, constraint: cause.constraint?.index };
  if (e.cause !== undefined) return uniqueViolation(e.cause);
  return { code: e.code, constraint: e.constraint };
}

// §4.4 steps 2–4, §16.3 row 2: the database holds these rules even when a
// caller bypasses the service, and future migrations must retain them.
describe('reports migration', () => {
  it('keeps all three CHECKs by name and definition', async () => {
    const rows = await harness.app.get(PrismaService).$queryRaw<Array<{ name: string; definition: string }>>`
      SELECT conname AS name, pg_get_constraintdef(oid) AS definition FROM pg_constraint
      WHERE conrelid = '"Report"'::regclass AND contype = 'c' ORDER BY conname`;
    expect(rows).toEqual([
      { name: 'report_exactly_one_target', definition: 'CHECK (((post_id IS NULL) <> (reported_student_id IS NULL)))' },
      { name: 'report_no_self_student', definition: 'CHECK (((reported_student_id IS NULL) OR (reporter_id <> reported_student_id)))' },
      {
        name: 'report_state_attribution',
        definition: 'CHECK ((((state = \'OPEN\'::"ReportState") AND (resolved_by_id IS NULL) AND (resolved_at IS NULL)) OR ((state <> \'OPEN\'::"ReportState") AND (resolved_by_id IS NOT NULL) AND (resolved_at IS NOT NULL))))',
      },
    ]);
  });

  it('keeps both target-specific partial unique indexes', async () => {
    const rows = await harness.app.get(PrismaService).$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'Report'
      AND indexname IN ('report_one_per_reporter_post', 'report_one_per_reporter_student') ORDER BY indexname`;
    expect(rows).toEqual([
      {
        indexname: 'report_one_per_reporter_post',
        indexdef: 'CREATE UNIQUE INDEX report_one_per_reporter_post ON public."Report" USING btree (reporter_id, post_id) WHERE (post_id IS NOT NULL)',
      },
      {
        indexname: 'report_one_per_reporter_student',
        indexdef: 'CREATE UNIQUE INDEX report_one_per_reporter_student ON public."Report" USING btree (reporter_id, reported_student_id) WHERE (reported_student_id IS NOT NULL)',
      },
    ]);
  });

  it('rejects both targets, neither target, self-reporting and invalid attribution', async () => {
    const { reporterId, studentId, postId } = await makeTargets();
    await expect(insertReport(reporterId, postId, studentId)).rejects.toThrow('report_exactly_one_target');
    await expect(insertReport(reporterId, null, null)).rejects.toThrow('report_exactly_one_target');
    await expect(insertReport(reporterId, null, reporterId)).rejects.toThrow('report_no_self_student');
    await expect(insertReport(reporterId, postId, null, 'OPEN', studentId, new Date()))
      .rejects.toThrow('report_state_attribution');
    await expect(insertReport(reporterId, postId, null, 'ACTIONED'))
      .rejects.toThrow('report_state_attribution');
    expect(await harness.app.get(PrismaService).report.count()).toBe(0);
  });

  it('admits a Post and its author once each, refusing a duplicate on either arm', async () => {
    const { reporterId, studentId, postId } = await makeTargets();
    await insertReport(reporterId, postId, null);
    await insertReport(reporterId, null, studentId);
    for (const [post, student, constraint] of [
      [postId, null, 'report_one_per_reporter_post'],
      [null, studentId, 'report_one_per_reporter_student'],
    ] as const) {
      const err = await insertReport(reporterId, post, student).then(() => undefined, (e: unknown) => e);
      expect(uniqueViolation(err)).toEqual({ code: '23505', constraint });
    }
    expect(await harness.app.get(PrismaService).report.count()).toBe(2);
  });
});
