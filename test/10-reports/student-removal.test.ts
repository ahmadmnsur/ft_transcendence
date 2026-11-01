import { describe, expect, it } from 'vitest';
import { AdminUsersService } from '../../src/admin/admin-users.service';
import type { Actor } from '../../src/core/actor';
import { PrismaService } from '../../src/core/prisma.service';
import { ModerationService } from '../../src/moderation/moderation.service';
import { createTestAccount, createTestStaff, type TestAccount } from '../harness/accounts';
import { useHarness } from '../harness/app';
import { fileTestReport } from '../harness/reports';

const harness = useHarness();

function actor(studentId: string): Actor {
  return { studentId, sessionHash: null };
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

function ref(account: TestAccount, isAdmin = false) {
  return { id: account.id, displayName: account.displayName, avatarUrl: null, isAdmin, removed: false };
}

async function rowsOn(studentId: string) {
  return harness.app.get(PrismaService).report.findMany({
    where: { reportedStudentId: studentId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { reporterId: true, state: true, resolvedById: true, resolvedAt: true },
  });
}

async function auditOf(account: TestAccount): Promise<{ items: Array<Record<string, unknown>>; total: number }> {
  const response = await harness.get('/api/admin/reports/resolved').set('Cookie', account.cookie).expect(200);
  return response.body.data;
}

const REMOVED_AT = new Date('2026-10-22T12:00:00.000Z');

describe('Remove Student and the Reports on them', () => {
  it('actions every open row at once, the removing Admin’s own included; the audit hides the batch from that Admin only', async () => {
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const other = await createTestStaff(harness.app, 'ADMIN');
    const target = await createTestAccount(harness.app);
    const reporter = await createTestAccount(harness.app);
    harness.clock.stopAt(new Date('2026-10-22T09:00:00.000Z'));
    await fileTestReport(harness.app, reporter.id, { studentId: target.id }, 'HARASSMENT', 'Rude in the thread.');
    harness.clock.stopAt(new Date('2026-10-22T09:01:00.000Z'));
    await fileTestReport(harness.app, admin.id, { studentId: target.id }, 'SPAM');
    const users = harness.app.get(AdminUsersService);

    await users.suspend(actor(admin.id), target.id);
    expect((await rowsOn(target.id)).map((row) => row.state)).toEqual(['OPEN', 'OPEN']);

    harness.clock.stopAt(REMOVED_AT);
    await users.remove(actor(admin.id), target.id);

    expect(await rowsOn(target.id)).toEqual([
      { reporterId: reporter.id, state: 'ACTIONED', resolvedById: admin.id, resolvedAt: REMOVED_AT },
      { reporterId: admin.id, state: 'ACTIONED', resolvedById: admin.id, resolvedAt: REMOVED_AT },
    ]);
    expect(await outcome(harness.app.get(ModerationService).resolveStudentGroup(actor(other.id), target.id, 'DISMISS'))).toBe(
      'already_resolved',
    );
    expect(await auditOf(admin)).toEqual({ items: [], total: 0 });
    expect(await auditOf(other)).toEqual({
      items: [
        {
          target: {
            kind: 'STUDENT',
            student: { id: target.id, displayName: 'Former student', avatarUrl: null, isAdmin: false, removed: true },
          },
          state: 'ACTIONED',
          resolvedBy: ref(admin, true),
          resolvedAt: REMOVED_AT.toISOString(),
          reports: [
            expect.objectContaining({ reason: 'HARASSMENT', text: 'Rude in the thread.', reporter: ref(reporter) }),
            expect.objectContaining({ reason: 'SPAM', reporter: ref(admin, true) }),
          ],
        },
      ],
      total: 1,
    });
  });

  it.each([0, 1] as const)('against a filing, released %s first', async (first) => {
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const target = await createTestAccount(harness.app);
    const earlier = await createTestAccount(harness.app);
    const late = await createTestAccount(harness.app);
    await fileTestReport(harness.app, earlier.id, { studentId: target.id });
    const names = ['report.file', 'student.remove'] as const;
    for (const name of names) harness.barriers.arm(name);
    const runs = [
      outcome(fileTestReport(harness.app, late.id, { studentId: target.id })),
      outcome(harness.app.get(AdminUsersService).remove(actor(admin.id), target.id)),
    ] as const;
    await harness.barriers.waitFor(names[0], 1);
    await harness.barriers.waitFor(names[1], 1);
    for (const name of names) harness.barriers.disarm(name);
    harness.barriers.release(names[first]);
    await runs[first];
    harness.barriers.release(names[1 - first]);
    const [filed, removed] = [await runs[0], await runs[1]];

    expect(removed).toBe('ok');
    expect(filed).toBe(first === 0 ? 'ok' : 'report_target_invalid');
    const rows = await rowsOn(target.id);
    expect(rows.map((row) => row.reporterId)).toEqual(first === 0 ? [earlier.id, late.id] : [earlier.id]);
    expect(rows.every((row) => row.state === 'ACTIONED' && row.resolvedById === admin.id)).toBe(true);
    expect(new Set(rows.map((row) => row.resolvedAt?.toISOString())).size).toBe(1);
  });
});
