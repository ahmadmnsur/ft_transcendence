import { describe, expect, it } from 'vitest';
import { insertCatalogue } from '../../prisma/seed/catalogue';
import { AdminUsersService } from '../../src/admin/admin-users.service';
import { AuthService } from '../../src/auth/auth.service';
import type { Actor } from '../../src/core/actor';
import { PrismaService } from '../../src/core/prisma.service';
import { SupabaseStorageClient } from '../../src/core/supabase-storage';
import { UnitOfWork } from '../../src/core/uow';
import { TEST_BUCKETS } from '../../src/files/buckets';
import { MatchingService } from '../../src/matching/matching.service';
import { MessagingService } from '../../src/messaging/messaging.service';
import { SocialService } from '../../src/social/social.service';
import { StudentsService } from '../../src/students/students.service';
import { useHarness } from '../harness/app';
import { createTestAccount, createTestStaff, openTestSession, type TestAccount } from '../harness/accounts';
import { eventually, makePng, putAvatar, tokenOf } from '../harness/files';
import { createTestPost, fileTestReport } from '../harness/reports';

const harness = useHarness();

function actor(studentId: string): Actor {
  return { studentId, sessionHash: null };
}

async function outcome(work: Promise<unknown>): Promise<string> {
  try {
    await work;
    return 'ok';
  } catch (error) {
    if (typeof (error as { code?: unknown }).code === 'string') return (error as { code: string }).code;
    throw error;
  }
}

// An Admin, the target and a learner who wants what the target teaches
// (§8.2: Score 35), before any Round opens.
async function unmatchedPair(): Promise<{ admin: TestAccount; target: TestAccount; learner: TestAccount }> {
  const skills = await insertCatalogue(harness.app.get(UnitOfWork));
  const docker = skills.get('Docker') as string;
  const students = harness.app.get(StudentsService);
  const admin = await createTestStaff(harness.app, 'ADMIN');
  const target = await createTestAccount(harness.app);
  const learner = await createTestAccount(harness.app);
  await students.setSkills(actor(target.id), [docker], []);
  await students.setSkills(actor(learner.id), [], [docker]);
  return { admin, target, learner };
}

// The same three, and an open Round that matched the target and the learner.
async function matchedPair(): Promise<{ admin: TestAccount; target: TestAccount; learner: TestAccount; matchId: string }> {
  const pair = await unmatchedPair();
  const matching = harness.app.get(MatchingService);
  await matching.openRound(actor(pair.admin.id));
  const match = (await matching.currentMatch(actor(pair.target.id))).match;
  if (match === null) throw new Error('matchedPair: the Round matched nobody.');
  return { ...pair, matchId: match.id };
}

// §12.7's Suspend row, §5.8, §8.8.
describe('Suspend', () => {
  it.each(['MATCHED', 'ACCEPTED'] as const)(
    'flags the target, ends their %s Match as TERMINATED_BY_ADMIN, deletes every Session and resolves no Report',
    async (status) => {
      const { admin, target, learner, matchId } = await matchedPair();
      const matching = harness.app.get(MatchingService);
      if (status === 'ACCEPTED') {
        await matching.accept(actor(target.id), matchId);
        await matching.accept(actor(learner.id), matchId);
      }
      await openTestSession(harness.app, target);
      await fileTestReport(harness.app, learner.id, { studentId: target.id });
      const prisma = harness.app.get(PrismaService);
      harness.recorder.clear();

      const response = await harness
        .post(`/api/admin/students/${target.id}/suspend`)
        .set('Cookie', admin.cookie)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true, data: { status: 'SUSPENDED' } });
      const row = await prisma.student.findUniqueOrThrow({ where: { id: target.id } });
      expect(row.suspendedAt).not.toBeNull();
      expect(row.removedAt).toBeNull();
      expect(await prisma.match.findUniqueOrThrow({ where: { id: matchId }, select: { status: true, declinedById: true } })).toEqual({
        status: 'TERMINATED_BY_ADMIN',
        declinedById: null,
      });
      expect(await prisma.session.count({ where: { studentId: target.id } })).toBe(0);
      expect(harness.recorder.events).toEqual([{ event: 'revokeSessions', args: [{ studentId: target.id }] }]);
      expect(await prisma.report.findMany({ select: { state: true } })).toEqual([{ state: 'OPEN' }]);
      // The old cookie no longer signs anyone in (§5.3).
      expect((await harness.get('/api/me').set('Cookie', target.cookie)).status).toBe(401);
      // The partner keeps their own sessions.
      expect((await harness.get('/api/me').set('Cookie', learner.cookie)).status).toBe(200);
    },
  );

  it('refuses a Student already Suspended, writing nothing', async () => {
    const { admin, target } = await matchedPair();
    const users = harness.app.get(AdminUsersService);
    await users.suspend(actor(admin.id), target.id);
    const prisma = harness.app.get(PrismaService);
    const before = await prisma.student.findUniqueOrThrow({ where: { id: target.id } });
    harness.recorder.clear();

    expect(await outcome(users.suspend(actor(admin.id), target.id))).toBe('already_suspended');
    expect(await prisma.student.findUniqueOrThrow({ where: { id: target.id } })).toEqual(before);
    expect(harness.recorder.events).toEqual([]);
  });
});

// §12.7's Remove row, §9.8, §12.5's guard scope (ADR-0011 d10).
describe('Remove', () => {
  it('flags the target, ends their Match, deletes their Sessions and Avatar, and actions every open Report on them', async () => {
    const { admin, target, learner, matchId } = await matchedPair();
    const prisma = harness.app.get(PrismaService);
    const upload = await putAvatar(harness.baseUrl, target.cookie, makePng());
    const token = tokenOf(upload.body.data.avatarUrl);
    const storage = harness.app.get(SupabaseStorageClient);
    expect((await storage.listAll(TEST_BUCKETS.avatars)).map((file) => file.name)).toContain(token);
    // Two open Reports on the target, one filed by the removing Admin, and
    // one on the learner, which the Removal leaves open.
    await fileTestReport(harness.app, learner.id, { studentId: target.id });
    await fileTestReport(harness.app, admin.id, { studentId: target.id });
    await fileTestReport(harness.app, target.id, { studentId: learner.id });
    harness.recorder.clear();

    const response = await harness.post(`/api/admin/students/${target.id}/remove`).set('Cookie', admin.cookie).send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, data: { status: 'REMOVED' } });
    const row = await prisma.student.findUniqueOrThrow({ where: { id: target.id } });
    expect(row.removedAt).not.toBeNull();
    expect((await prisma.match.findUniqueOrThrow({ where: { id: matchId } })).status).toBe('TERMINATED_BY_ADMIN');
    expect(await prisma.session.count({ where: { studentId: target.id } })).toBe(0);
    expect(await prisma.avatar.count({ where: { studentId: target.id } })).toBe(0);
    const onTarget = await prisma.report.findMany({
      where: { reportedStudentId: target.id },
      select: { state: true, resolvedById: true, resolvedAt: true },
    });
    expect(onTarget).toEqual([
      { state: 'ACTIONED', resolvedById: admin.id, resolvedAt: row.removedAt },
      { state: 'ACTIONED', resolvedById: admin.id, resolvedAt: row.removedAt },
    ]);
    expect(await prisma.report.findMany({ where: { reportedStudentId: learner.id }, select: { state: true } })).toEqual([
      { state: 'OPEN' },
    ]);
    expect(harness.recorder.events).toEqual([{ event: 'revokeSessions', args: [{ studentId: target.id }] }]);
    // The avatar's file goes after commit, without holding the response.
    await eventually(async () => {
      expect((await storage.listAll(TEST_BUCKETS.avatars)).map((file) => file.name)).not.toContain(token);
    });
    expect((await harness.get('/api/me').set('Cookie', target.cookie)).status).toBe(401);
  });

  it('removes a Suspended Student, and refuses every sanction on a Removed one', async () => {
    const { admin, target } = await matchedPair();
    const users = harness.app.get(AdminUsersService);
    await users.suspend(actor(admin.id), target.id);
    expect(await outcome(users.remove(actor(admin.id), target.id))).toBe('ok');
    const prisma = harness.app.get(PrismaService);
    const before = await prisma.student.findUniqueOrThrow({ where: { id: target.id } });

    expect(await outcome(users.remove(actor(admin.id), target.id))).toBe('student_removed');
    expect(await outcome(users.reinstate(actor(admin.id), target.id))).toBe('student_removed');
    expect(await outcome(users.suspend(actor(admin.id), target.id))).toBe('student_removed');
    expect(await prisma.student.findUniqueOrThrow({ where: { id: target.id } })).toEqual(before);
  });
});

// §12.7's common reads (ADR-0008 d9): an Admin never sanctions themselves,
// and an unknown Student is not found.
describe('the common reads', () => {
  it('refuses every sanction on the Admin’s own account, writing nothing', async () => {
    const admin = await createTestStaff(harness.app, 'ADMIN');
    await createTestStaff(harness.app, 'ADMIN');
    const users = harness.app.get(AdminUsersService);
    const prisma = harness.app.get(PrismaService);
    const before = await prisma.student.findUniqueOrThrow({ where: { id: admin.id } });

    expect(await outcome(users.suspend(actor(admin.id), admin.id))).toBe('self_action_forbidden');
    expect(await outcome(users.remove(actor(admin.id), admin.id))).toBe('self_action_forbidden');
    expect(await outcome(users.reinstate(actor(admin.id), admin.id))).toBe('self_action_forbidden');
    expect(await prisma.student.findUniqueOrThrow({ where: { id: admin.id } })).toEqual(before);
    const unknown = '0199a3d0-0000-7000-8000-000000000000';
    expect(await outcome(users.suspend(actor(admin.id), unknown))).toBe('not_found');
    // A Student is refused at the route, before the service (§5.3).
    const student = await createTestAccount(harness.app);
    expect((await harness.post(`/api/admin/students/${admin.id}/suspend`).set('Cookie', student.cookie).send({})).status).toBe(403);
  });
});

// §12.7's Reinstate row: the flag is cleared and nothing is revived.
describe('Reinstate', () => {
  it('clears the flag; the terminated Match stays terminated and no session comes back', async () => {
    const { admin, target, matchId } = await matchedPair();
    const users = harness.app.get(AdminUsersService);
    await users.suspend(actor(admin.id), target.id);
    const prisma = harness.app.get(PrismaService);
    harness.recorder.clear();

    const response = await harness
      .post(`/api/admin/students/${target.id}/reinstate`)
      .set('Cookie', admin.cookie)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, data: { status: 'ACTIVE' } });
    expect((await prisma.student.findUniqueOrThrow({ where: { id: target.id } })).suspendedAt).toBeNull();
    expect((await prisma.match.findUniqueOrThrow({ where: { id: matchId } })).status).toBe('TERMINATED_BY_ADMIN');
    expect(await prisma.session.count({ where: { studentId: target.id } })).toBe(0);
    expect(harness.recorder.events).toEqual([]);
    // Signing in again works: a fresh session resolves.
    const cookie = await openTestSession(harness.app, target);
    expect((await harness.get('/api/me').set('Cookie', cookie)).status).toBe(200);
  });

  it('refuses a Student who is not Suspended, writing nothing', async () => {
    const { admin, target } = await matchedPair();
    const prisma = harness.app.get(PrismaService);
    const before = await prisma.student.findUniqueOrThrow({ where: { id: target.id } });

    expect(await outcome(harness.app.get(AdminUsersService).reinstate(actor(admin.id), target.id))).toBe('not_suspended');
    expect(await prisma.student.findUniqueOrThrow({ where: { id: target.id } })).toEqual(before);
  });
});

type Sanction = 'suspend' | 'remove';

function sanction(kind: Sanction, adminId: string, targetId: string): Promise<unknown> {
  const users = harness.app.get(AdminUsersService);
  return kind === 'suspend' ? users.suspend(actor(adminId), targetId) : users.remove(actor(adminId), targetId);
}

// Two held operations, released in the order given; both promises are
// returned settled.
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

async function matchesOf(studentId: string): Promise<Array<{ status: string }>> {
  return harness.app
    .get(PrismaService)
    .match.findMany({ where: { OR: [{ mentorId: studentId }, { menteeId: studentId }] }, select: { status: true } });
}

// §3.6.3 *Eligibility vs Match creation* (ADR-0008 d2 and d5's note of
// 2026-09-21), §16.3 row 7: a sanction reads the target's in-progress
// Matches and a creation reads the target's flags, so the two have one serial
// order, and a committed sanction never leaves or creates an in-progress
// Match for the target.
describe.each(['suspend', 'remove'] as const)('%s against Match creation', (kind) => {
  const checkpoint = `student.${kind}`;

  it.each([0, 1] as const)('and Round open, released %s first: no in-progress Match for the target', async (first) => {
    const pair = await unmatchedPair();
    const [admin, target, learner] = [pair.admin.id, pair.target.id, pair.learner.id];
    const matching = harness.app.get(MatchingService);

    const [sanctioned, opened] = await stage(
      [checkpoint, 'round.open'],
      () => [outcome(sanction(kind, admin, target)), outcome(matching.openRound(actor(admin)))],
      first,
    );

    expect([sanctioned, opened]).toEqual(['ok', 'ok']);
    // Sanction first: the Round leaves the target out. Round open first: the
    // sanction's retry reads the new Match and terminates it.
    expect(await matchesOf(target)).toEqual(first === 0 ? [] : [{ status: 'TERMINATED_BY_ADMIN' }]);
    const round = await harness.app.get(PrismaService).round.findFirstOrThrow({ select: { id: true } });
    const detail = await matching.getRound(actor(admin), round.id);
    // Derived now: the learner is unmatched either way, the target never.
    expect(detail.unmatched?.map((student) => student.id)).toEqual([learner]);
  });

  // An open Round with nobody matched: the learner lists no Skill while it
  // opens, then wants what the target teaches.
  async function emptyOpenRound(admin: string, learner: string): Promise<void> {
    const students = harness.app.get(StudentsService);
    const docker = (await harness.app.get(PrismaService).skill.findFirstOrThrow({ where: { name: 'Docker' } })).id;
    await students.setSkills(actor(learner), [], []);
    await harness.app.get(MatchingService).openRound(actor(admin));
    await students.setSkills(actor(learner), [], [docker]);
  }

  it.each([0, 1] as const)('and hand-made creation, released %s first: no in-progress Match for the target', async (first) => {
    const pair = await unmatchedPair();
    const [admin, target, learner] = [pair.admin.id, pair.target.id, pair.learner.id];
    await emptyOpenRound(admin, learner);
    const matching = harness.app.get(MatchingService);

    const [sanctioned, created] = await stage(
      [checkpoint, 'match.handmade'],
      () => [outcome(sanction(kind, admin, target)), outcome(matching.createHandMadeMatch(actor(admin), [target, learner]))],
      first,
    );

    // Sanction first: the creation's retry finds no candidate. Creation
    // first: the sanction's retry terminates the new Match.
    expect([sanctioned, created]).toEqual(['ok', first === 0 ? 'not_a_candidate' : 'ok']);
    expect(await matchesOf(target)).toEqual(first === 0 ? [] : [{ status: 'TERMINATED_BY_ADMIN' }]);
  });
});

// §12.7, ADR-0008 d9 and §16.3 row 7: two Admins suspending or removing each
// other have one serial order. The first to commit takes the other out of
// the active Admins, so their retry re-reads their own flags and is refused,
// and at least one active Admin always remains.
describe('two Admins sanctioning each other', () => {
  const pairs = [
    ['suspend', 'suspend'],
    ['remove', 'remove'],
    ['suspend', 'remove'],
  ] as const;

  for (const [byA, byB] of pairs) {
    it.each([0, 1] as const)(`A ${byA}s B while B ${byB}s A, released %s first: exactly one commits`, async (first) => {
      const a = await createTestStaff(harness.app, 'ADMIN');
      const b = await createTestStaff(harness.app, 'ADMIN');
      const names = [`student.${byA}`, `student.${byB}`] as const;
      for (const name of new Set(names)) harness.barriers.arm(name);
      // One at a time, so each name's arrival order is known.
      const runA = outcome(sanction(byA, a.id, b.id));
      await harness.barriers.waitFor(names[0], 1);
      const runB = outcome(sanction(byB, b.id, a.id));
      await harness.barriers.waitFor(names[1], byA === byB ? 2 : 1);
      for (const name of new Set(names)) harness.barriers.disarm(name);
      const runs = [runA, runB] as const;
      if (byA === byB) {
        harness.barriers.releaseAt(names[0], first);
        await runs[first];
        harness.barriers.releaseAll(names[0]);
      } else {
        harness.barriers.release(names[first]);
        await runs[first];
        harness.barriers.release(names[1 - first]);
      }
      const results = [await runs[0], await runs[1]];

      expect(results[first]).toBe('ok');
      expect(results[1 - first]).toBe('unauthenticated');
      const active = await harness.app
        .get(PrismaService)
        .student.findMany({ where: { role: 'ADMIN', suspendedAt: null, removedAt: null }, select: { id: true } });
      expect(active).toEqual([{ id: first === 0 ? a.id : b.id }]);
    });
  }
});

// §4.3.1 (*"a Removed row accepts no update of any column"*), §4.5, §16.3 row
// 7: after a real Removal, every writer of the Student row refuses and writes
// nothing, and the email refuses sign-up.
describe('a Removed row', () => {
  it('refuses every mutation of it, from the Users table and from its owner, and its email refuses sign-up', async () => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const docker = skills.get('Docker') as string;
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const target = await createTestAccount(harness.app);
    const students = harness.app.get(StudentsService);
    await students.setSkills(actor(target.id), [], [docker]);
    await students.setLearningGoal(actor(target.id), docker, 'Ship a container.');
    const users = harness.app.get(AdminUsersService);
    await users.remove(actor(admin.id), target.id);
    const prisma = harness.app.get(PrismaService);
    const before = await prisma.student.findUniqueOrThrow({ where: { id: target.id } });
    const owner = actor(target.id);
    const png = { buffer: makePng(), originalname: 'avatar.png', mimetype: 'image/png' };

    // The Users table: `student_removed` for every edit, the role and every
    // sanction (§12.7).
    for (const write of [
      () => users.editUser(actor(admin.id), target.id, { displayName: 'After' }),
      () => users.editUser(actor(admin.id), target.id, { email: 'new@peerconnect.test' }),
      () => users.setSkills(actor(admin.id), target.id, [docker], []),
      () => users.setLearningGoal(actor(admin.id), target.id, docker, 'Ship it.'),
      () => users.clearLearningGoal(actor(admin.id), target.id),
      () => users.putAvatar(actor(admin.id), target.id, png),
      () => users.deleteAvatar(actor(admin.id), target.id),
      () => users.changeRole(actor(admin.id), target.id, 'PEER_MODERATOR'),
      () => users.suspend(actor(admin.id), target.id),
      () => users.reinstate(actor(admin.id), target.id),
      () => users.remove(actor(admin.id), target.id),
    ]) {
      expect(await outcome(write())).toBe('student_removed');
    }
    // The owner's own writes, as a constructed actor, since every session is
    // gone: `unauthenticated` (§3.4).
    for (const write of [
      () => students.updateOwnProfile(owner, { displayName: 'After' }),
      () => students.setSkills(owner, [docker], []),
      () => students.setLearningGoal(owner, docker, 'Ship it.'),
      () => students.clearLearningGoal(owner),
      () => harness.app.get(AuthService).changePassword(owner, target.password, 'a-new-password-1'),
    ]) {
      expect(await outcome(write())).toBe('unauthenticated');
    }
    expect(await prisma.student.findUniqueOrThrow({ where: { id: target.id } })).toEqual(before);
    expect(await prisma.studentSkill.count({ where: { studentId: target.id } })).toBe(1);

    // The email stays burned (§4.3.1), and sign-in tells of the Removal only
    // after the right password (§5.1).
    const signup = await harness
      .post('/api/auth/signup')
      .send({ email: target.email, password: 'another-password-1', displayName: 'Someone Else', acceptTerms: true });
    expect(signup.body).toMatchObject({ ok: false, error: { code: 'email_unavailable' } });
    const login = await harness.post('/api/auth/login').send({ email: target.email, password: target.password });
    expect(login.body).toMatchObject({ ok: false, error: { code: 'account_removed' } });
  });
});

// §4.6's Removed-row surface rule (§3.8.2), over the surfaces built so far,
// after a real Removal: discovery and participation leave the Student out,
// historical relations show the tombstone with the default avatar, and the
// Users table keeps the row, view-only.
describe('the surface rule after a Removal', () => {
  const tombstone = (id: string) => ({ id, displayName: 'Former student', avatarUrl: null, isAdmin: false, removed: true });

  it('leaves the Student out of discovery and participation, and shows the tombstone on what stays', async () => {
    const { admin, target, learner: viewer, matchId } = await matchedPair();
    const asker = await createTestAccount(harness.app);
    const social = harness.app.get(SocialService);
    const request = await social.requestFriend(actor(target.id), viewer.id);
    await social.acceptFriend(actor(viewer.id), request.id);
    await social.requestFriend(actor(asker.id), target.id);
    await harness.app.get(MessagingService).send(actor(target.id), viewer.id, 'See you at the meeting.');
    const postId = await createTestPost(harness.app, target.id, 'What an index plan shows.');
    await putAvatar(harness.baseUrl, target.cookie, makePng());
    await harness.app.get(UnitOfWork).run('fixture-xp', async (tx) => {
      await tx.student.update({ where: { id: target.id }, data: { xp: 300 } });
    });
    const get = (path: string, cookie = viewer.cookie) => harness.get(path).set('Cookie', cookie);
    // Before: the target is found, ranked and named.
    expect((await get(`/api/students?q=${encodeURIComponent(target.displayName)}`)).body.data.total).toBe(1);
    expect((await get('/api/leaderboard')).body.data.top[0].student.id).toBe(target.id);

    await harness.app.get(AdminUsersService).remove(actor(admin.id), target.id);

    // Discovery and participation: search, the Leaderboard, friend lists,
    // pending requests, new friend requests, new DMs and new Reports.
    expect((await get(`/api/students?q=${encodeURIComponent(target.displayName)}`)).body.data).toEqual({ items: [], total: 0 });
    expect((await get('/api/leaderboard')).body.data.top.map((row: { student: { id: string } }) => row.student.id)).not.toContain(target.id);
    expect((await get('/api/friends')).body.data).toEqual({ items: [] });
    expect((await get('/api/friends/requests', asker.cookie)).body.data).toEqual({ incoming: [], outgoing: [] });
    expect((await harness.post('/api/friends/requests').set('Cookie', asker.cookie).send({ studentId: target.id })).body).toMatchObject({
      ok: false,
      error: { code: 'student_removed' },
    });
    expect(await outcome(harness.app.get(MessagingService).send(actor(viewer.id), target.id, 'Hello?'))).toBe('dm_unavailable');
    expect(
      (await harness.post('/api/reports').set('Cookie', viewer.cookie).send({ studentId: target.id, reason: 'SPAM' })).body,
    ).toMatchObject({ ok: false, error: { code: 'report_target_invalid' } });

    // Historical relations: the profile, the Post, the Match and the thread.
    expect((await get(`/api/students/${target.id}`)).body.data).toEqual({ student: tombstone(target.id), profile: null });
    const feed = (await get('/api/feed')).body.data.items as Array<{ id: string; author: unknown }>;
    expect(feed.find((item) => item.id === postId)?.author).toEqual(tombstone(target.id));
    const history = (await get('/api/matches')).body.data.items as Array<{ id: string; partner: unknown; status: string }>;
    expect(history.find((item) => item.id === matchId)).toMatchObject({ partner: tombstone(target.id), status: 'TERMINATED_BY_ADMIN' });
    const threads = (await get('/api/messages/threads')).body.data.items as Array<{ peer: unknown; canSend: boolean }>;
    expect(threads).toEqual([expect.objectContaining({ peer: tombstone(target.id), canSend: false })]);

    // The Users table: the row stays, named, Removed, with the default avatar.
    const rows = (await get('/api/admin/students?status=REMOVED', admin.cookie)).body.data;
    expect(rows).toEqual({
      items: [{ id: target.id, displayName: target.displayName, email: target.email, role: 'STUDENT', status: 'REMOVED', avatarUrl: null }],
      total: 1,
    });
    expect((await get(`/api/admin/students/${target.id}`, admin.cookie)).body.data).toMatchObject({
      displayName: target.displayName,
      status: 'REMOVED',
      avatarUrl: null,
    });
  });
});
