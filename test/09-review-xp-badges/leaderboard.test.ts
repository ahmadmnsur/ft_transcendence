import { expect, it } from 'vitest';
import { UnitOfWork } from '../../src/core/uow';
import { createTestAccount, createTestStaff, type TestAccount } from '../harness/accounts';
import { useHarness } from '../harness/app';

const harness = useHarness();
const leaderboard = (cookie: string) => harness.get('/api/leaderboard').set('Cookie', cookie);

async function setXp(student: TestAccount, xp: number): Promise<void> {
  await harness.app.get(UnitOfWork).run('fixture-xp', async (tx) => {
    await tx.student.update({ where: { id: student.id }, data: { xp } });
  });
}

it('ranks only eligible participants by XP and id, and pins the viewer only outside the top ten', async () => {
  // These accounts have ascending UUIDv7 ids. Create the two tied Students
  // first so the lower id must win regardless of the XP write order.
  const students: TestAccount[] = [];
  for (let i = 0; i < 11; i++) students.push(await createTestAccount(harness.app));
  expect(students[8].id < students[9].id).toBe(true);
  const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
  const admin = await createTestStaff(harness.app, 'ADMIN');
  const suspended = await createTestAccount(harness.app);
  const removed = await createTestAccount(harness.app);
  const xp = [2600, 2000, 1500, 1250, 1000, 750, 500, 250, 100, 100, 100];
  await harness.app.get(UnitOfWork).run('fixture-leaderboard', async (tx, ctx) => {
    for (let i = students.length - 1; i >= 0; i--)
      await tx.student.update({ where: { id: students[i].id }, data: { xp: xp[i] } });
    await tx.student.update({ where: { id: moderator.id }, data: { xp: 2250 } });
    await tx.student.update({ where: { id: admin.id }, data: { xp: 9000 } });
    await tx.student.update({ where: { id: suspended.id }, data: { xp: 8000, suspendedAt: ctx.now } });
    await tx.student.update({ where: { id: removed.id }, data: { xp: 7000, removedAt: ctx.now } });
  });

  const result = await leaderboard(students[9].cookie);
  expect(result.status).toBe(200);
  // The moderator takes rank 2; the first of the 100-XP ties takes rank 10.
  const ranked = [students[0], moderator, ...students.slice(1, 9)];
  const expectedXp = [2600, 2250, 2000, 1500, 1250, 1000, 750, 500, 250, 100];
  const expectedLevels = [10, 10, 9, 7, 6, 5, 4, 3, 2, 1];
  expect(result.body).toEqual({
    ok: true,
    data: {
      top: ranked.map((student, index) => ({
        rank: index + 1,
        student: {
          id: student.id, displayName: student.displayName, avatarUrl: null,
          isAdmin: false, removed: false,
        },
        xp: expectedXp[index],
        level: expectedLevels[index],
      })),
      me: { rank: 11, xp: 100, level: 1 },
    },
  });
  expect((await leaderboard(students[10].cookie)).body.data.me).toEqual({ rank: 12, xp: 100, level: 1 });
  expect((await leaderboard(students[8].cookie)).body.data.me).toBeNull();
  expect((await leaderboard(moderator.cookie)).body.data.me).toBeNull();
  expect((await leaderboard(admin.cookie)).body.data).toEqual({ ...result.body.data, me: null });
  expect((await harness.get('/api/me/progress').set('Cookie', admin.cookie)).body.data).toMatchObject({ xp: 9000, level: 10 });
});

it('never reintroduces an Admin through the pin, and demotion restores the retained XP rank', async () => {
  const students: TestAccount[] = [];
  for (let i = 0; i < 10; i++) students.push(await createTestAccount(harness.app));
  for (const student of students) await setXp(student, 250);
  const viewer = await createTestAccount(harness.app);
  await setXp(viewer, 120);
  const read = () => leaderboard(viewer.cookie);
  expect((await read()).body.data.me).toEqual({ rank: 11, xp: 120, level: 1 });
  await harness.app.get(UnitOfWork).run('fixture-promotion', async (tx) => {
    await tx.student.update({ where: { id: viewer.id }, data: { role: 'ADMIN' } });
  });
  expect((await read()).body.data.me).toBeNull();
  expect((await harness.get('/api/me/progress').set('Cookie', viewer.cookie)).body.data.xp).toBe(120);
  await harness.app.get(UnitOfWork).run('fixture-demotion', async (tx) => {
    await tx.student.update({ where: { id: viewer.id }, data: { role: 'PEER_MODERATOR' } });
  });
  expect((await read()).body.data.me).toEqual({ rank: 11, xp: 120, level: 1 });
});

it('returns an empty board for an Admin alone and includes zero-XP Students on a short board', async () => {
  const admin = await createTestStaff(harness.app, 'ADMIN');
  expect((await leaderboard(admin.cookie)).body.data).toEqual({ top: [], me: null });
  const student = await createTestAccount(harness.app);
  expect((await leaderboard(student.cookie)).body.data).toEqual({
    top: [{
      rank: 1, xp: 0, level: 1,
      student: { id: student.id, displayName: student.displayName, avatarUrl: null, isAdmin: false, removed: false },
    }],
    me: null,
  });
});
