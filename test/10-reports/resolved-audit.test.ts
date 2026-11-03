import { describe, expect, it } from 'vitest';
import type { Actor } from '../../src/core/actor';
import { ModerationService } from '../../src/moderation/moderation.service';
import { createTestAccount, createTestStaff, type TestAccount } from '../harness/accounts';
import { useHarness } from '../harness/app';
import { createTestPost, fileTestReport } from '../harness/reports';

const harness = useHarness();

function actor(studentId: string): Actor {
  return { studentId, sessionHash: null };
}

function ref(account: TestAccount, isAdmin = false) {
  return { id: account.id, displayName: account.displayName, avatarUrl: null, isAdmin, removed: false };
}

function at(iso: string): void {
  harness.clock.stopAt(new Date(iso));
}

async function auditOf(account: TestAccount, query = ''): Promise<{ items: Array<Record<string, unknown>>; total: number }> {
  const response = await harness.get(`/api/admin/reports/resolved${query}`).set('Cookie', account.cookie).expect(200);
  return response.body.data;
}

describe('the resolved audit', () => {
  it('lists each batch newest first, with its target, state, resolver, time and every row with its reporter', async () => {
    const moderation = harness.app.get(ModerationService);
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
    const viewer = await createTestStaff(harness.app, 'ADMIN');
    const author = await createTestAccount(harness.app);
    const first = await createTestAccount(harness.app);
    const second = await createTestAccount(harness.app);
    const postId = await createTestPost(harness.app, author.id, 'A Post later removed.');
    at('2026-10-22T09:00:00.000Z');
    await fileTestReport(harness.app, first.id, { postId }, 'SPAM', 'Advertising.');
    at('2026-10-22T10:00:00.000Z');
    await moderation.resolvePostGroup(actor(admin.id), postId, 'DISMISS');
    at('2026-10-22T11:00:00.000Z');
    await fileTestReport(harness.app, second.id, { postId }, 'HARASSMENT');
    at('2026-10-22T11:30:00.000Z');
    await fileTestReport(harness.app, first.id, { studentId: author.id }, 'OTHER', 'Fake account.');
    at('2026-10-22T11:31:00.000Z');
    await fileTestReport(harness.app, second.id, { studentId: author.id }, 'OTHER');
    at('2026-10-22T12:00:00.000Z');
    await moderation.resolvePostGroup(actor(moderator.id), postId, 'REMOVE_POST');
    at('2026-10-22T13:00:00.000Z');
    await moderation.resolveStudentGroup(actor(admin.id), author.id, 'ACTION');

    const post = {
      id: postId,
      author: ref(author),
      body: 'A Post later removed.',
      createdAt: expect.any(String),
      origin: 'PROMPT_ANSWER',
      prompt: { id: expect.any(String), question: 'What did you learn?' },
    };
    const studentBatch = {
      target: { kind: 'STUDENT', student: ref(author) },
      state: 'ACTIONED',
      resolvedBy: ref(admin, true),
      resolvedAt: '2026-10-22T13:00:00.000Z',
      reports: [
        { reporter: ref(second), reason: 'OTHER', text: null, createdAt: '2026-10-22T11:31:00.000Z' },
        { reporter: ref(first), reason: 'OTHER', text: 'Fake account.', createdAt: '2026-10-22T11:30:00.000Z' },
      ],
    };
    const removal = {
      target: { kind: 'POST', post: { ...post, removed: true } },
      state: 'ACTIONED',
      resolvedBy: ref(moderator),
      resolvedAt: '2026-10-22T12:00:00.000Z',
      reports: [{ reporter: ref(second), reason: 'HARASSMENT', text: null, createdAt: '2026-10-22T11:00:00.000Z' }],
    };
    const dismissal = {
      target: { kind: 'POST', post: { ...post, removed: true } },
      state: 'DISMISSED',
      resolvedBy: ref(admin, true),
      resolvedAt: '2026-10-22T10:00:00.000Z',
      reports: [{ reporter: ref(first), reason: 'SPAM', text: 'Advertising.', createdAt: '2026-10-22T09:00:00.000Z' }],
    };
    expect(await auditOf(viewer)).toEqual({ items: [studentBatch, removal, dismissal], total: 3 });
    expect(await auditOf(viewer, '?page=1&pageSize=2')).toEqual({ items: [studentBatch, removal], total: 3 });
    expect(await auditOf(viewer, '?page=2&pageSize=2')).toEqual({ items: [dismissal], total: 3 });
    expect(await auditOf(viewer, '?page=3&pageSize=2')).toEqual({ items: [], total: 3 });
  });

  it('hides batches about the viewing Admin and shows batches holding their Report', async () => {
    const moderation = harness.app.get(ModerationService);
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const other = await createTestStaff(harness.app, 'ADMIN');
    const reporter = await createTestAccount(harness.app);
    const author = await createTestAccount(harness.app);
    const ownPost = await createTestPost(harness.app, admin.id);
    const filedIn = await createTestPost(harness.app, author.id);
    const unrelated = await createTestPost(harness.app, author.id);
    await fileTestReport(harness.app, reporter.id, { postId: ownPost });
    await fileTestReport(harness.app, reporter.id, { studentId: admin.id });
    at('2026-10-22T09:00:00.000Z');
    await fileTestReport(harness.app, reporter.id, { postId: filedIn });
    at('2026-10-22T09:01:00.000Z');
    await fileTestReport(harness.app, admin.id, { postId: filedIn });
    await fileTestReport(harness.app, reporter.id, { postId: unrelated });
    at('2026-10-22T10:00:00.000Z');
    await moderation.resolvePostGroup(actor(other.id), ownPost, 'DISMISS');
    at('2026-10-22T10:01:00.000Z');
    await moderation.resolveStudentGroup(actor(other.id), admin.id, 'DISMISS');
    at('2026-10-22T10:02:00.000Z');
    await moderation.resolvePostGroup(actor(other.id), filedIn, 'REMOVE_POST');
    at('2026-10-22T10:03:00.000Z');
    await moderation.resolvePostGroup(actor(admin.id), unrelated, 'DISMISS');

    const seen = (items: Array<Record<string, unknown>>) =>
      items.map((batch) => {
        const target = batch.target as { post?: { id: string }; student?: { id: string } };
        return target.post?.id ?? target.student?.id;
      });
    const own = await auditOf(admin);
    expect(own.total).toBe(2);
    expect(seen(own.items)).toEqual([unrelated, filedIn]);
    expect(own.items[1]).toMatchObject({
      resolvedBy: ref(other, true),
      reports: [{ reporter: ref(admin, true) }, { reporter: ref(reporter) }],
    });
    const others = await auditOf(other);
    expect(others.total).toBe(4);
    expect(seen(others.items)).toEqual([unrelated, filedIn, admin.id, ownPost]);
    expect(others.items[1]).toMatchObject({
      resolvedBy: ref(other, true),
      reports: [{ reporter: ref(admin, true) }, { reporter: ref(reporter) }],
    });
  });
});
