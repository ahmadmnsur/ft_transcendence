import { describe, expect, it } from 'vitest';
import { AdminUsersService } from '../../src/admin/admin-users.service';
import { FortyTwoService } from '../../src/auth/forty-two.service';
import type { Actor } from '../../src/core/actor';
import { PrismaService } from '../../src/core/prisma.service';
import { parseSessionCookie } from '../../src/core/session-cookie';
import { useHarness } from '../harness/app';
import { createTestAccount, createTestStaff, type TestAccount } from '../harness/accounts';
import { FIXED_ID, callback, fixedFortyTwo, roundTrip, stateOf } from '../harness/forty-two';

const harness = useHarness(fixedFortyTwo());

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

async function rowOf(studentId: string) {
  return harness.app.get(PrismaService).student.findUniqueOrThrow({ where: { id: studentId } });
}

async function removeBy(admin: TestAccount, studentId: string): Promise<void> {
  await harness.app.get(AdminUsersService).remove(actor(admin.id), studentId);
}

async function connectedStudent(): Promise<TestAccount> {
  const account = await createTestAccount(harness.app);
  const connected = await roundTrip(harness, account, 'link');
  expect(connected.headers.location).toBe('/me?oauth=connected');
  return account;
}

describe('a Removed row and the 42 writers', () => {
  it.each(['removal', 'connect'] as const)('Connect 42 against a Removal, %s first', async (first) => {
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const account = await createTestAccount(harness.app);
    const started = await harness
      .post('/api/auth/42/start')
      .set('Cookie', account.cookie)
      .send({ intent: 'link', password: account.password });
    expect(started.body).toMatchObject({ ok: true });
    const names = ['forty-two-link', 'student.remove'] as const;
    for (const name of names) harness.barriers.arm(name);
    const back = callback(harness, stateOf(started.body), account.cookie).then((response) => response);
    await harness.barriers.waitFor('forty-two-link', 1);
    const removal = outcome(harness.app.get(AdminUsersService).remove(actor(admin.id), account.id));
    await harness.barriers.waitFor('student.remove', 1);
    for (const name of names) harness.barriers.disarm(name);
    if (first === 'removal') {
      harness.barriers.release('student.remove');
      expect(await removal).toBe('ok');
      harness.barriers.release('forty-two-link');
    } else {
      harness.barriers.release('forty-two-link');
      await back;
      harness.barriers.release('student.remove');
    }

    const response = await back;
    expect(await removal).toBe('ok');
    expect(response.headers.location === '/me?oauth=connected').toBe(first === 'connect');
    const row = await rowOf(account.id);
    expect(row.removedAt).not.toBeNull();
    expect(row.fortyTwoId).toBe(first === 'connect' ? FIXED_ID : null);
  }, 20_000);

  it('refuses Disconnect 42 on a Removed row, which keeps its 42 account number', async () => {
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const account = await connectedStudent();
    await removeBy(admin, account.id);
    const before = await rowOf(account.id);
    expect(before.fortyTwoId).toBe(FIXED_ID);

    const disconnect = harness.app.get(FortyTwoService).disconnect42({ actor: actor(account.id), password: account.password });

    expect(await outcome(disconnect)).toBe('unauthenticated');
    expect(await rowOf(account.id)).toEqual(before);
  }, 20_000);

  it('refuses the new password after Confirm with 42 once the Student is Removed', async () => {
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const account = await connectedStudent();
    const confirmed = await roundTrip(harness, account, 'confirm');
    expect(confirmed.headers.location).toBe('/me?oauth=confirmed');
    await removeBy(admin, account.id);
    const before = await rowOf(account.id);

    expect((await harness.post('/api/auth/42/password').set('Cookie', account.cookie).send({ newPassword: 'a-new-password-1' })).status).toBe(401);
    const setting = harness.app.get(FortyTwoService).setPasswordAfter42({
      actor: actor(account.id),
      sessionToken: parseSessionCookie(account.cookie).token,
      newPassword: 'a-new-password-1',
    });

    expect(await outcome(setting)).toBe('unauthenticated');
    expect(await rowOf(account.id)).toEqual(before);
    const login = await harness.post('/api/auth/login').send({ email: account.email, password: account.password });
    expect(login.body).toMatchObject({ ok: false, error: { code: 'account_removed' } });
  }, 20_000);
});
