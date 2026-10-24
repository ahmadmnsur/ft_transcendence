import { describe, expect, it } from 'vitest';
import { AdminUsersService } from '../../src/admin/admin-users.service';
import type { Actor } from '../../src/core/actor';
import { PrismaService } from '../../src/core/prisma.service';
import { ModerationService } from '../../src/moderation/moderation.service';
import { SocialService } from '../../src/social/social.service';
import { createTestAccount, createTestStaff, type TestAccount } from '../harness/accounts';
import { useHarness } from '../harness/app';
import { createTestPost, fileTestReport } from '../harness/reports';

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

// Two held operations, released in the order given; both settle before this
// returns (§3.6.4).
async function stage(
  names: readonly [string, string],
  start: () => [Promise<string>, Promise<string>],
  firstReleased: 0 | 1,
): Promise<[string, string]> {
  for (const name of names) harness.barriers.arm(name);
  const runs = start();
  await harness.barriers.waitFor(names[0], 1);
  await harness.barriers.waitFor(names[1], 1);
  for (const name of names) harness.barriers.disarm(name);
  harness.barriers.release(names[firstReleased]);
  await runs[firstReleased];
  harness.barriers.release(names[1 - firstReleased]);
  return [await runs[0], await runs[1]];
}

async function removedAt(postId: string): Promise<Date | null> {
  const post = await harness.app.get(PrismaService).post.findUniqueOrThrow({ where: { id: postId } });
  return post.removedAt;
}

async function rowsOn(target: { postId: string } | { reportedStudentId: string }) {
  return harness.app.get(PrismaService).report.findMany({
    where: target,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { reporterId: true, state: true, resolvedById: true, resolvedAt: true },
  });
}

// A Post by a fresh author with two open Reports, one minute apart.
async function reportedPost(): Promise<{ postId: string; author: TestAccount; reporters: [TestAccount, TestAccount] }> {
  const author = await createTestAccount(harness.app);
  const first = await createTestAccount(harness.app);
  const second = await createTestAccount(harness.app);
  const postId = await createTestPost(harness.app, author.id);
  harness.clock.stopAt(new Date('2026-10-22T09:00:00.000Z'));
  await fileTestReport(harness.app, first.id, { postId });
  harness.clock.stopAt(new Date('2026-10-22T09:01:00.000Z'));
  await fileTestReport(harness.app, second.id, { postId });
  return { postId, author, reporters: [first, second] };
}

const RESOLVED_AT = new Date('2026-10-22T12:00:00.000Z');

// §12.5, §3.6.3 *Report group resolution*, §16.3 row 10.
describe('resolving a report group', () => {
  it.each([
    ['DISMISS', 'REMOVE_POST'],
    ['REMOVE_POST', 'DISMISS'],
  ] as const)('%s first: the other gets already_resolved and changes nothing', async (winner, loser) => {
    const moderation = harness.app.get(ModerationService);
    const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const { postId, reporters } = await reportedPost();
    harness.clock.stopAt(RESOLVED_AT);
    harness.barriers.arm('moderation.resolve');
    const first = outcome(moderation.resolvePostGroup(actor(moderator.id), postId, winner));
    await harness.barriers.waitFor('moderation.resolve', 1);
    const second = outcome(moderation.resolvePostGroup(actor(admin.id), postId, loser));
    await harness.barriers.waitFor('moderation.resolve', 2);
    harness.barriers.disarm('moderation.resolve');
    harness.barriers.release('moderation.resolve');
    expect(await first).toBe('ok');
    harness.barriers.release('moderation.resolve');
    expect(await second).toBe('already_resolved');

    // A losing removal never removes the Post; a winning one is never
    // rewritten to DISMISSED. Every row of the batch shares state, resolver
    // and time.
    expect(await removedAt(postId)).toEqual(winner === 'REMOVE_POST' ? RESOLVED_AT : null);
    const state = winner === 'REMOVE_POST' ? 'ACTIONED' : 'DISMISSED';
    expect(await rowsOn({ postId })).toEqual(
      reporters.map((reporter) => ({ reporterId: reporter.id, state, resolvedById: moderator.id, resolvedAt: RESOLVED_AT })),
    );
  });

  it('Remove Post actions every open row with the removal and leaves an earlier batch as it was', async () => {
    const moderation = harness.app.get(ModerationService);
    const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const author = await createTestAccount(harness.app);
    const [first, second, third] = [
      await createTestAccount(harness.app),
      await createTestAccount(harness.app),
      await createTestAccount(harness.app),
    ];
    const postId = await createTestPost(harness.app, author.id);
    const dismissedAt = new Date('2026-10-22T10:00:00.000Z');
    harness.clock.stopAt(new Date('2026-10-22T09:00:00.000Z'));
    await fileTestReport(harness.app, first.id, { postId });
    harness.clock.stopAt(dismissedAt);
    expect(await moderation.resolvePostGroup(actor(admin.id), postId, 'DISMISS')).toEqual({ state: 'DISMISSED', count: 1 });
    // §12.2: a later filing by another reporter opens a new group.
    harness.clock.stopAt(new Date('2026-10-22T11:00:00.000Z'));
    await fileTestReport(harness.app, second.id, { postId });
    harness.clock.stopAt(new Date('2026-10-22T11:01:00.000Z'));
    await fileTestReport(harness.app, third.id, { postId });
    harness.clock.stopAt(RESOLVED_AT);
    expect(await moderation.resolvePostGroup(actor(moderator.id), postId, 'REMOVE_POST')).toEqual({ state: 'ACTIONED', count: 2 });

    expect(await removedAt(postId)).toEqual(RESOLVED_AT);
    expect(await rowsOn({ postId })).toEqual([
      { reporterId: first.id, state: 'DISMISSED', resolvedById: admin.id, resolvedAt: dismissedAt },
      { reporterId: second.id, state: 'ACTIONED', resolvedById: moderator.id, resolvedAt: RESOLVED_AT },
      { reporterId: third.id, state: 'ACTIONED', resolvedById: moderator.id, resolvedAt: RESOLVED_AT },
    ]);
    // Nothing is left open: a second action finds no group.
    expect(await outcome(moderation.resolvePostGroup(actor(admin.id), postId, 'DISMISS'))).toBe('already_resolved');
  });

  it.each([
    ['filing first: it joins the group and is actioned with it', 0],
    ['removal first: the filing is refused report_target_invalid', 1],
  ] as const)('filing vs Remove Post, %s', async (_name, firstReleased) => {
    const moderation = harness.app.get(ModerationService);
    const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
    const author = await createTestAccount(harness.app);
    const first = await createTestAccount(harness.app);
    const late = await createTestAccount(harness.app);
    const postId = await createTestPost(harness.app, author.id);
    harness.clock.stopAt(new Date('2026-10-22T09:00:00.000Z'));
    await fileTestReport(harness.app, first.id, { postId });
    harness.clock.stopAt(RESOLVED_AT);
    const [filing, removal] = await stage(
      ['report.file', 'moderation.resolve'],
      () => [
        outcome(moderation.file(actor(late.id), { target: { postId }, reason: 'SPAM' })),
        outcome(moderation.resolvePostGroup(actor(moderator.id), postId, 'REMOVE_POST')),
      ],
      firstReleased,
    );
    expect(removal).toBe('ok');
    expect(await removedAt(postId)).toEqual(RESOLVED_AT);
    const actioned = { state: 'ACTIONED', resolvedById: moderator.id, resolvedAt: RESOLVED_AT };
    if (firstReleased === 0) {
      expect(filing).toBe('ok');
      expect(await rowsOn({ postId })).toEqual([
        { reporterId: first.id, ...actioned },
        { reporterId: late.id, ...actioned },
      ]);
    } else {
      expect(filing).toBe('report_target_invalid');
      expect(await rowsOn({ postId })).toEqual([{ reporterId: first.id, ...actioned }]);
    }
  });

  // §12.2: a Dismiss leaves the Post reportable. Held after their reads,
  // the dismissal read no row of the filing, so whichever commits first the
  // serial order is dismissal then filing: the late Report opens a new group.
  // A Report filed before the dismissal reads joins its batch, as the first
  // test's two rows do.
  it.each([
    ['the filing commits first', 0],
    ['the dismissal commits first', 1],
  ] as const)('filing vs Dismiss, both held, %s: the late Report opens a new group', async (_name, firstReleased) => {
    const moderation = harness.app.get(ModerationService);
    const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
    const author = await createTestAccount(harness.app);
    const first = await createTestAccount(harness.app);
    const late = await createTestAccount(harness.app);
    const postId = await createTestPost(harness.app, author.id);
    harness.clock.stopAt(new Date('2026-10-22T09:00:00.000Z'));
    await fileTestReport(harness.app, first.id, { postId });
    harness.clock.stopAt(RESOLVED_AT);
    const [filing, dismissal] = await stage(
      ['report.file', 'moderation.resolve'],
      () => [
        outcome(moderation.file(actor(late.id), { target: { postId }, reason: 'SPAM' })),
        outcome(moderation.resolvePostGroup(actor(moderator.id), postId, 'DISMISS')),
      ],
      firstReleased,
    );
    expect([filing, dismissal]).toEqual(['ok', 'ok']);
    expect(await removedAt(postId)).toBeNull();
    expect(await rowsOn({ postId })).toEqual([
      { reporterId: first.id, state: 'DISMISSED', resolvedById: moderator.id, resolvedAt: RESOLVED_AT },
      { reporterId: late.id, state: 'OPEN', resolvedById: null, resolvedAt: null },
    ]);
  });

  // §12.5, ADR-0011 d7: the Block guard is evaluated at the action's
  // serialization point, never from the queue the moderator read.
  describe('a Block racing a Peer Moderator action', () => {
    it('a Block in place before the action reads refuses it conflict_of_interest, the queue read before notwithstanding', async () => {
      const moderation = harness.app.get(ModerationService);
      const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
      const { postId, reporters } = await reportedPost();
      const queue = await harness.get('/api/moderation/queue').set('Cookie', moderator.cookie).expect(200);
      expect(queue.body.data.items).toHaveLength(1);
      await harness.app.get(SocialService).block(actor(reporters[1].id), moderator.id);
      expect(await outcome(moderation.resolvePostGroup(actor(moderator.id), postId, 'REMOVE_POST'))).toBe('conflict_of_interest');
      expect(await removedAt(postId)).toBeNull();
      expect((await rowsOn({ postId })).map((row) => row.state)).toEqual(['OPEN', 'OPEN']);
    });

    it.each([
      ['the action commits first', 0],
      ['the Block commits first, after the action read no Block', 1],
    ] as const)('both held after their reads, %s: the action stands and the Block leaves its attribution alone', async (_name, firstReleased) => {
      const moderation = harness.app.get(ModerationService);
      const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
      const { postId, author, reporters } = await reportedPost();
      harness.clock.stopAt(RESOLVED_AT);
      const [action, block] = await stage(
        ['moderation.resolve', 'block-create'],
        () => [
          outcome(moderation.resolvePostGroup(actor(moderator.id), postId, 'REMOVE_POST')),
          outcome(harness.app.get(SocialService).block(actor(author.id), moderator.id)),
        ],
        firstReleased,
      );
      expect([action, block]).toEqual(['ok', 'ok']);
      expect(await removedAt(postId)).toEqual(RESOLVED_AT);
      expect(await rowsOn({ postId })).toEqual(
        reporters.map((reporter) => ({ reporterId: reporter.id, state: 'ACTIONED', resolvedById: moderator.id, resolvedAt: RESOLVED_AT })),
      );
    });

    it('a Block lifted first lets the action through', async () => {
      const moderation = harness.app.get(ModerationService);
      const social = harness.app.get(SocialService);
      const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
      const { postId, reporters } = await reportedPost();
      await social.block(actor(moderator.id), reporters[0].id);
      await social.unblock(actor(moderator.id), reporters[0].id);
      expect(await moderation.resolvePostGroup(actor(moderator.id), postId, 'DISMISS')).toEqual({ state: 'DISMISSED', count: 2 });
    });

    it('an action ordered before the lift commits is refused conflict_of_interest, and the lift still commits', async () => {
      const moderation = harness.app.get(ModerationService);
      const social = harness.app.get(SocialService);
      const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
      const { postId, reporters } = await reportedPost();
      await social.block(actor(moderator.id), reporters[0].id);
      harness.barriers.arm('block-lift');
      const lift = outcome(social.unblock(actor(moderator.id), reporters[0].id));
      await harness.barriers.waitFor('block-lift', 1);
      harness.barriers.disarm('block-lift');
      expect(await outcome(moderation.resolvePostGroup(actor(moderator.id), postId, 'REMOVE_POST'))).toBe('conflict_of_interest');
      harness.barriers.release('block-lift');
      expect(await lift).toBe('ok');
      expect(await removedAt(postId)).toBeNull();
      expect((await rowsOn({ postId })).map((row) => row.state)).toEqual(['OPEN', 'OPEN']);
    });
  });

  // ADR-0011 d9: an Admin never resolves a complaint about themselves or
  // their own complaint; another Admin can.
  it.each([
    ['a Post they wrote', 'own-post'],
    ['their own Student row', 'own-row'],
    ['a group holding a Report they filed', 'filed'],
  ] as const)('refuses an Admin a group about %s, and lets another Admin resolve it', async (_name, kind) => {
    const moderation = harness.app.get(ModerationService);
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const other = await createTestStaff(harness.app, 'ADMIN');
    const reporter = await createTestAccount(harness.app);
    const author = await createTestAccount(harness.app);
    let resolve: (by: string) => Promise<unknown>;
    let target: { postId: string } | { reportedStudentId: string };
    if (kind === 'own-row') {
      await fileTestReport(harness.app, reporter.id, { studentId: admin.id });
      resolve = (by) => moderation.resolveStudentGroup(actor(by), admin.id, 'ACTION');
      target = { reportedStudentId: admin.id };
    } else {
      const postId = await createTestPost(harness.app, kind === 'own-post' ? admin.id : author.id);
      await fileTestReport(harness.app, reporter.id, { postId });
      if (kind === 'filed') await fileTestReport(harness.app, admin.id, { postId });
      resolve = (by) => moderation.resolvePostGroup(actor(by), postId, 'REMOVE_POST');
      target = { postId };
    }
    expect(await outcome(resolve(admin.id))).toBe('conflict_of_interest');
    expect((await rowsOn(target)).every((row) => row.state === 'OPEN')).toBe(true);
    expect(await outcome(resolve(other.id))).toBe('ok');
    expect((await rowsOn(target)).every((row) => row.state === 'ACTIONED' && row.resolvedById === other.id)).toBe(true);
  });

  // ADR-0008 d10: an Admin's guard is self-interest alone, so a Block either
  // way with the author or a reporter refuses nothing.
  it.each([
    ['the Admin blocked a reporter', 'admin-blocks'],
    ['the author blocked the Admin', 'author-blocks'],
  ] as const)('lets an Admin resolve a group when %s', async (_name, kind) => {
    const moderation = harness.app.get(ModerationService);
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const { postId, author, reporters } = await reportedPost();
    if (kind === 'admin-blocks') await harness.app.get(SocialService).block(actor(admin.id), reporters[0].id);
    else await harness.app.get(SocialService).block(actor(author.id), admin.id);
    expect(await moderation.resolvePostGroup(actor(admin.id), postId, 'DISMISS')).toEqual({ state: 'DISMISSED', count: 2 });
  });

  it('answers the routes by role, re-reading it on every action', async () => {
    const moderation = harness.app.get(ModerationService);
    const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const student = await createTestAccount(harness.app);
    const { postId, author } = await reportedPost();
    await fileTestReport(harness.app, student.id, { studentId: author.id });
    const postGroup = `/api/moderation/post-groups/${postId}/resolve`;
    const studentGroup = `/api/moderation/student-groups/${author.id}/resolve`;

    await harness.post(postGroup).set('Cookie', student.cookie).send({ action: 'DISMISS' }).expect(403);
    await harness.post(studentGroup).set('Cookie', moderator.cookie).send({ action: 'DISMISS' }).expect(403);
    await harness.post(postGroup).set('Cookie', moderator.cookie).send({ action: 'ACTION' }).expect(400);
    await harness.post(studentGroup).set('Cookie', admin.cookie).send({ action: 'REMOVE_POST' }).expect(400);

    // §16.3 row 10: a stale queue read, then a demotion, grants nothing. The
    // request stops at the route guard, and a demotion can also commit after
    // the guard's read, so the direct call checks the role the action
    // re-reads in its own transaction (§12.5).
    await harness.get('/api/moderation/queue').set('Cookie', moderator.cookie).expect(200);
    await harness.app.get(AdminUsersService).changeRole(actor(admin.id), moderator.id, 'STUDENT');
    await harness.post(postGroup).set('Cookie', moderator.cookie).send({ action: 'REMOVE_POST' }).expect(403);
    expect(await outcome(moderation.resolvePostGroup(actor(moderator.id), postId, 'REMOVE_POST'))).toBe('forbidden');
    expect(await removedAt(postId)).toBeNull();

    const removed = await harness.post(postGroup).set('Cookie', admin.cookie).send({ action: 'REMOVE_POST' }).expect(200);
    expect(removed.body).toEqual({ ok: true, data: { state: 'ACTIONED', count: 2 } });
    const again = await harness.post(postGroup).set('Cookie', admin.cookie).send({ action: 'DISMISS' }).expect(200);
    expect(again.body).toMatchObject({ ok: false, error: { code: 'already_resolved' } });
    const actioned = await harness.post(studentGroup).set('Cookie', admin.cookie).send({ action: 'ACTION' }).expect(200);
    expect(actioned.body).toEqual({ ok: true, data: { state: 'ACTIONED', count: 1 } });
    // `ACTION` applies no sanction (§12.5): the Student stays Active.
    const row = await harness.app.get(PrismaService).student.findUniqueOrThrow({ where: { id: author.id } });
    expect([row.suspendedAt, row.removedAt]).toEqual([null, null]);
  });
});
