import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { SocialService } from '../../src/social/social.service';
import { createTestAccount, createTestStaff, type TestAccount } from '../harness/accounts';
import { useHarness } from '../harness/app';
import { createTestPost, fileTestReport } from '../harness/reports';

const harness = useHarness();

function ref(account: TestAccount, isAdmin = false) {
  return { id: account.id, displayName: account.displayName, avatarUrl: null, isAdmin, removed: false };
}

function at(iso: string): void {
  harness.clock.stopAt(new Date(iso));
}

async function queueOf(account: TestAccount): Promise<Array<{ target: { kind: string; post?: { id: string }; student?: { id: string } } }>> {
  const response = await harness.get('/api/moderation/queue').set('Cookie', account.cookie).expect(200);
  return response.body.data.items;
}

function targetIds(items: Awaited<ReturnType<typeof queueOf>>): string[] {
  return items.map((group) => group.target.post?.id ?? group.target.student?.id ?? '');
}

describe('the moderation queue', () => {
  it('shows a Peer Moderator only eligible open Post groups, oldest open row first, never a reporter', async () => {
    const prisma = harness.app.get(PrismaService);
    const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
    const author = await createTestAccount(harness.app);
    const first = await createTestAccount(harness.app);
    const second = await createTestAccount(harness.app);
    const later = await createTestPost(harness.app, author.id, 'Later group.');
    const earlier = await createTestPost(harness.app, author.id, 'Earlier group.');
    at('2026-10-22T09:00:00.000Z');
    await fileTestReport(harness.app, first.id, { postId: earlier }, 'SPAM', 'Copied from a forum.');
    at('2026-10-22T09:30:00.000Z');
    await fileTestReport(harness.app, first.id, { postId: later }, 'HARASSMENT');
    at('2026-10-22T10:00:00.000Z');
    await fileTestReport(harness.app, second.id, { postId: earlier }, 'OTHER', 'Off topic.');
    await fileTestReport(harness.app, first.id, { studentId: author.id });
    const resolved = await createTestPost(harness.app, author.id);
    await fileTestReport(harness.app, second.id, { postId: resolved });
    await prisma.$executeRaw`
      UPDATE "Report" SET state = 'DISMISSED', resolved_by_id = ${moderator.id}::uuid, resolved_at = CURRENT_TIMESTAMP
       WHERE post_id = ${resolved}::uuid`;
    const own = await createTestPost(harness.app, moderator.id);
    await fileTestReport(harness.app, first.id, { postId: own });
    const filedIn = await createTestPost(harness.app, author.id);
    await fileTestReport(harness.app, first.id, { postId: filedIn });
    await fileTestReport(harness.app, moderator.id, { postId: filedIn });

    const response = await harness.get('/api/moderation/queue').set('Cookie', moderator.cookie).expect(200);
    const prompt = { id: expect.any(String), question: 'What did you learn?' };
    const post = (id: string, body: string) => ({
      id,
      author: ref(author),
      body,
      createdAt: expect.any(String),
      origin: 'PROMPT_ANSWER',
      prompt,
      removed: false,
    });
    expect(response.body).toEqual({
      ok: true,
      data: {
        items: [
          {
            target: { kind: 'POST', post: post(earlier, 'Earlier group.') },
            count: 2,
            reports: [
              { reason: 'SPAM', text: 'Copied from a forum.', createdAt: '2026-10-22T09:00:00.000Z' },
              { reason: 'OTHER', text: 'Off topic.', createdAt: '2026-10-22T10:00:00.000Z' },
            ],
          },
          {
            target: { kind: 'POST', post: post(later, 'Later group.') },
            count: 1,
            reports: [{ reason: 'HARASSMENT', text: null, createdAt: '2026-10-22T09:30:00.000Z' }],
          },
        ],
      },
    });
  });

  it('hides a whole group from a Peer Moderator for one Block with its author or any open reporter, either way', async () => {
    const social = harness.app.get(SocialService);
    const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const author = await createTestAccount(harness.app);
    const blockedAuthor = await createTestAccount(harness.app);
    const clean = await createTestAccount(harness.app);
    const blocked = await createTestAccount(harness.app);
    const blocker = await createTestAccount(harness.app);
    const visible = await createTestPost(harness.app, author.id);
    const reporterBlocked = await createTestPost(harness.app, author.id);
    const reporterBlocks = await createTestPost(harness.app, author.id);
    const authorBlocked = await createTestPost(harness.app, blockedAuthor.id);
    at('2026-10-22T09:00:00.000Z');
    await fileTestReport(harness.app, clean.id, { postId: visible });
    at('2026-10-22T09:01:00.000Z');
    await fileTestReport(harness.app, clean.id, { postId: reporterBlocked });
    await fileTestReport(harness.app, blocked.id, { postId: reporterBlocked });
    at('2026-10-22T09:02:00.000Z');
    await fileTestReport(harness.app, clean.id, { postId: reporterBlocks });
    await fileTestReport(harness.app, blocker.id, { postId: reporterBlocks });
    at('2026-10-22T09:03:00.000Z');
    await fileTestReport(harness.app, clean.id, { postId: authorBlocked });
    await social.block({ studentId: moderator.id, sessionHash: null }, blocked.id);
    await social.block({ studentId: blocker.id, sessionHash: null }, moderator.id);
    await social.block({ studentId: moderator.id, sessionHash: null }, blockedAuthor.id);

    const moderatorQueue = await queueOf(moderator);
    expect(targetIds(moderatorQueue)).toEqual([visible]);
    expect(targetIds(await queueOf(admin))).toEqual([visible, reporterBlocked, reporterBlocks, authorBlocked]);
  });

  it('shows an Admin both kinds with reporters, except their own targets and any group holding their row', async () => {
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const other = await createTestStaff(harness.app, 'ADMIN');
    const author = await createTestAccount(harness.app);
    const reporter = await createTestAccount(harness.app);
    const reported = await createTestAccount(harness.app);
    const ownPost = await createTestPost(harness.app, admin.id);
    const filedIn = await createTestPost(harness.app, author.id);
    const open = await createTestPost(harness.app, author.id);
    at('2026-10-22T09:00:00.000Z');
    await fileTestReport(harness.app, reporter.id, { postId: ownPost });
    at('2026-10-22T09:01:00.000Z');
    await fileTestReport(harness.app, reporter.id, { studentId: admin.id });
    at('2026-10-22T09:02:00.000Z');
    await fileTestReport(harness.app, reporter.id, { postId: filedIn });
    at('2026-10-22T09:02:30.000Z');
    await fileTestReport(harness.app, admin.id, { postId: filedIn });
    at('2026-10-22T09:03:00.000Z');
    await fileTestReport(harness.app, admin.id, { studentId: author.id });
    at('2026-10-22T09:04:00.000Z');
    await fileTestReport(harness.app, reporter.id, { postId: open }, 'SPAM', 'Advertising.');
    at('2026-10-22T09:05:00.000Z');
    await fileTestReport(harness.app, reporter.id, { studentId: reported.id }, 'HARASSMENT', 'Insults in messages.');

    const response = await harness.get('/api/moderation/queue').set('Cookie', admin.cookie).expect(200);
    expect(response.body.data.items).toEqual([
      {
        target: { kind: 'POST', post: expect.objectContaining({ id: open, author: ref(author), removed: false }) },
        count: 1,
        reports: [{ reporter: ref(reporter), reason: 'SPAM', text: 'Advertising.', createdAt: '2026-10-22T09:04:00.000Z' }],
      },
      {
        target: { kind: 'STUDENT', student: ref(reported) },
        count: 1,
        reports: [
          { reporter: ref(reporter), reason: 'HARASSMENT', text: 'Insults in messages.', createdAt: '2026-10-22T09:05:00.000Z' },
        ],
      },
    ]);
    const otherQueue = await queueOf(other);
    expect(targetIds(otherQueue)).toEqual([ownPost, admin.id, filedIn, author.id, open, reported.id]);
    expect(otherQueue[2]).toMatchObject({
      count: 2,
      reports: [{ reporter: ref(reporter) }, { reporter: ref(admin, true) }],
    });
  });

  it('refuses the queue to a Student and the resolved audit to a Peer Moderator', async () => {
    const student = await createTestAccount(harness.app);
    const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
    const queue = await harness.get('/api/moderation/queue').set('Cookie', student.cookie).expect(403);
    expect(queue.body).toMatchObject({ ok: false, error: { code: 'forbidden' } });
    const audit = await harness.get('/api/admin/reports/resolved').set('Cookie', moderator.cookie).expect(403);
    expect(audit.body).toMatchObject({ ok: false, error: { code: 'forbidden' } });
  });
});
