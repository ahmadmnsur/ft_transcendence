import { describe, expect, it } from 'vitest';
import { insertCatalogue } from '../../prisma/seed/catalogue';
import { AdminUsersService } from '../../src/admin/admin-users.service';
import type { Actor } from '../../src/core/actor';
import { PrismaService } from '../../src/core/prisma.service';
import { UnitOfWork } from '../../src/core/uow';
import { MatchingService } from '../../src/matching/matching.service';
import type { Role } from '../../src/shared/roles';
import { StudentsService } from '../../src/students/students.service';
import { useHarness } from '../harness/app';
import { createTestAccount, createTestStaff } from '../harness/accounts';
import { makePng } from '../harness/files';

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

async function roleOf(studentId: string): Promise<Role | undefined> {
  const row = await harness.app.get(PrismaService).student.findUnique({ where: { id: studentId }, select: { role: true } });
  return row?.role;
}

async function activeAdmins(): Promise<number> {
  return harness.app
    .get(PrismaService)
    .student.count({ where: { role: 'ADMIN', suspendedAt: null, removedAt: null } });
}

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

describe('a role change against Match creation', () => {
  async function pair(targetRole: 'STUDENT' | 'ADMIN') {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const docker = skills.get('Docker') as string;
    const students = harness.app.get(StudentsService);
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const target = targetRole === 'ADMIN' ? await createTestStaff(harness.app, 'ADMIN') : await createTestAccount(harness.app);
    const learner = await createTestAccount(harness.app);
    await students.setSkills(actor(target.id), [docker], []);
    await students.setSkills(actor(learner.id), [], [docker]);
    return { admin: actor(admin.id), target: target.id, learner: learner.id };
  }

  it.each([0, 1] as const)('promotion and Round open, released %s first: the Round matches the Student it read', async (first) => {
    const { admin, target, learner } = await pair('STUDENT');
    const users = harness.app.get(AdminUsersService);
    const matching = harness.app.get(MatchingService);

    const [role, open] = await stage(
      ['role-change', 'round.open'],
      () => [outcome(users.changeRole(admin, target, 'ADMIN')), outcome(matching.openRound(admin))],
      first,
    );

    expect([role, open]).toEqual(['ok', 'ok']);
    expect(await roleOf(target)).toBe('ADMIN');
    const round = await harness.app.get(PrismaService).round.findFirstOrThrow({ select: { id: true } });
    const detail = await matching.getRound(admin, round.id);
    expect(detail.matches.map((match) => [match.mentor.id, match.mentee.id])).toEqual([[target, learner]]);
  });

  it.each([0, 1] as const)('demotion and Round open, released %s first: the Round leaves out the Admin it read', async (first) => {
    const { admin, target, learner } = await pair('ADMIN');
    const users = harness.app.get(AdminUsersService);
    const matching = harness.app.get(MatchingService);

    const [role, open] = await stage(
      ['role-change', 'round.open'],
      () => [outcome(users.changeRole(admin, target, 'STUDENT')), outcome(matching.openRound(admin))],
      first,
    );

    expect([role, open]).toEqual(['ok', 'ok']);
    expect(await roleOf(target)).toBe('STUDENT');
    const round = await harness.app.get(PrismaService).round.findFirstOrThrow({ select: { id: true } });
    const detail = await matching.getRound(admin, round.id);
    expect(detail.matches).toEqual([]);
    expect(detail.unmatched?.map((student) => student.id).sort()).toEqual([learner, target].sort());
  });

  it('a promotion that commits before the Round opens leaves the new Admin out', async () => {
    const { admin, target, learner } = await pair('STUDENT');
    await harness.app.get(AdminUsersService).changeRole(admin, target, 'ADMIN');
    const opened = await harness.app.get(MatchingService).openRound(admin);
    expect(opened.matchCount).toBe(0);
    expect(opened.unmatched.map((student) => student.id)).toEqual([learner]);
  });

  async function emptyOpenRound(admin: Actor, learner: string): Promise<void> {
    const students = harness.app.get(StudentsService);
    const docker = (await harness.app.get(PrismaService).skill.findFirstOrThrow({ where: { name: 'Docker' } })).id;
    await students.setSkills(actor(learner), [], []);
    await harness.app.get(MatchingService).openRound(admin);
    await students.setSkills(actor(learner), [], [docker]);
  }

  async function matchesOf(target: string): Promise<number> {
    return harness.app.get(PrismaService).match.count({ where: { OR: [{ mentorId: target }, { menteeId: target }] } });
  }

  it.each([0, 1] as const)('promotion and hand-made creation, released %s first: the Match stands', async (first) => {
    const { admin, target, learner } = await pair('STUDENT');
    const users = harness.app.get(AdminUsersService);
    const matching = harness.app.get(MatchingService);
    await emptyOpenRound(admin, learner);

    const [role, creation] = await stage(
      ['role-change', 'match.handmade'],
      () => [
        outcome(users.changeRole(admin, target, 'ADMIN')),
        outcome(matching.createHandMadeMatch(admin, [target, learner])),
      ],
      first,
    );

    expect([role, creation]).toEqual(['ok', 'ok']);
    expect(await roleOf(target)).toBe('ADMIN');
    expect(await matchesOf(target)).toBe(1);
  });

  it('demotion held while a hand-made creation reads the Admin: the creation refuses, the demotion commits', async () => {
    const { admin, target, learner } = await pair('ADMIN');
    await emptyOpenRound(admin, learner);
    const users = harness.app.get(AdminUsersService);

    harness.barriers.arm('role-change');
    const demotion = outcome(users.changeRole(admin, target, 'STUDENT'));
    await harness.barriers.waitFor('role-change', 1);
    harness.barriers.disarm('role-change');
    expect(await outcome(harness.app.get(MatchingService).createHandMadeMatch(admin, [target, learner]))).toBe(
      'not_a_candidate',
    );
    harness.barriers.release('role-change');

    expect(await demotion).toBe('ok');
    expect(await roleOf(target)).toBe('STUDENT');
    expect(await matchesOf(target)).toBe(0);
  });

  it('demotion committed before a hand-made creation: the creation pairs the new Student', async () => {
    const { admin, target, learner } = await pair('ADMIN');
    await emptyOpenRound(admin, learner);

    await harness.app.get(AdminUsersService).changeRole(admin, target, 'STUDENT');
    expect(await outcome(harness.app.get(MatchingService).createHandMadeMatch(admin, [target, learner]))).toBe('ok');
    expect(await matchesOf(target)).toBe(1);
  });
});

describe('two Admins demoting each other', () => {
  it.each([0, 1] as const)('released %s first: exactly one demotion commits', async (first) => {
    const a = await createTestStaff(harness.app, 'ADMIN');
    const b = await createTestStaff(harness.app, 'ADMIN');
    const users = harness.app.get(AdminUsersService);

    harness.barriers.arm('role-change');
    const byA = outcome(users.changeRole(actor(a.id), b.id, 'STUDENT'));
    await harness.barriers.waitFor('role-change', 1);
    const byB = outcome(users.changeRole(actor(b.id), a.id, 'STUDENT'));
    await harness.barriers.waitFor('role-change', 2);
    const runs = [byA, byB] as const;
    harness.barriers.disarm('role-change');
    harness.barriers.releaseAt('role-change', first);
    await runs[first];
    harness.barriers.releaseAll('role-change');
    const results = [await runs[0], await runs[1]];

    expect(results[first]).toBe('ok');
    expect(results[1 - first]).toBe('forbidden');
    expect(await activeAdmins()).toBe(1);
    expect(await roleOf(first === 0 ? a.id : b.id)).toBe('ADMIN');
    expect(await roleOf(first === 0 ? b.id : a.id)).toBe('STUDENT');
  });
});

describe('the Users-table refusals', () => {
  it('refuses every edit and the role change on a Removed target, with the row unchanged', async () => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const docker = skills.get('Docker') as string;
    const admin = actor((await createTestStaff(harness.app, 'ADMIN')).id);
    const target = await createTestAccount(harness.app, { displayName: 'Before Removal' });
    await harness.app.get(StudentsService).setSkills(actor(target.id), [], [docker]);
    await harness.app.get(UnitOfWork).run('fixture-removal', async (tx, ctx) => {
      await tx.student.update({ where: { id: target.id }, data: { removedAt: ctx.now } });
    });
    const before = await harness.app.get(PrismaService).student.findUniqueOrThrow({ where: { id: target.id } });
    const users = harness.app.get(AdminUsersService);

    expect(await outcome(users.editUser(admin, target.id, { displayName: 'After' }))).toBe('student_removed');
    expect(await outcome(users.editUser(admin, target.id, { email: 'new@peerconnect.test' }))).toBe('student_removed');
    expect(await outcome(users.setSkills(admin, target.id, [docker], []))).toBe('student_removed');
    expect(await outcome(users.setLearningGoal(admin, target.id, docker, 'Ship it.'))).toBe('student_removed');
    expect(await outcome(users.clearLearningGoal(admin, target.id))).toBe('student_removed');
    const png = { buffer: makePng(), originalname: 'avatar.png', mimetype: 'image/png' };
    expect(await outcome(users.putAvatar(admin, target.id, png))).toBe('student_removed');
    expect(await outcome(users.deleteAvatar(admin, target.id))).toBe('student_removed');
    expect(await outcome(users.changeRole(admin, target.id, 'PEER_MODERATOR'))).toBe('student_removed');

    const prisma = harness.app.get(PrismaService);
    expect(await prisma.student.findUniqueOrThrow({ where: { id: target.id } })).toEqual(before);
    expect(await prisma.studentSkill.count({ where: { studentId: target.id } })).toBe(1);
    expect(await prisma.avatar.count()).toBe(0);
  });

  it('refuses an Admin changing their own role, and answers not_found for an unknown Student', async () => {
    const admin = await createTestStaff(harness.app, 'ADMIN');
    await createTestStaff(harness.app, 'ADMIN');
    const users = harness.app.get(AdminUsersService);

    expect(await outcome(users.changeRole(actor(admin.id), admin.id, 'STUDENT'))).toBe('self_action_forbidden');
    expect(await roleOf(admin.id)).toBe('ADMIN');
    expect(await outcome(users.changeRole(actor(admin.id), '0199a3d0-0000-7000-8000-000000000000', 'STUDENT'))).toBe(
      'not_found',
    );
  });

  it('writes the role alone: the target keeps every session and signs in as the new role on the next request', async () => {
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const student = await createTestAccount(harness.app);
    await harness.app.get(UnitOfWork).run('fixture-progress', async (tx) => {
      await tx.student.update({ where: { id: student.id }, data: { xp: 200, streak: 3 } });
    });
    const prisma = harness.app.get(PrismaService);
    const before = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    const sessions = await prisma.session.count({ where: { studentId: student.id } });
    harness.recorder.clear();

    expect((await harness.get('/api/admin/students').set('Cookie', student.cookie)).status).toBe(403);
    const changed = await harness
      .post(`/api/admin/students/${student.id}/role`)
      .set('Cookie', admin.cookie)
      .send({ role: 'ADMIN' });
    expect(changed.status).toBe(200);
    expect(changed.body).toEqual({ ok: true, data: { role: 'ADMIN' } });

    expect(await prisma.student.findUniqueOrThrow({ where: { id: student.id } })).toEqual({ ...before, role: 'ADMIN' });
    expect(await prisma.session.count({ where: { studentId: student.id } })).toBe(sessions);
    expect(harness.recorder.events).toEqual([]);
    expect((await harness.get('/api/admin/students').set('Cookie', student.cookie)).status).toBe(200);
  });
});
