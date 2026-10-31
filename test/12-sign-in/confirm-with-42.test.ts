import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { useHarness } from '../harness/app';
import { createTestAccount, type TestAccount } from '../harness/accounts';
import { fixedFortyTwo, roundTrip } from '../harness/forty-two';

const harness = useHarness(fixedFortyTwo());
const NEW_PASSWORD = 'a-new-password-1';
const MINUTE_MS = 60 * 1000;

function setPassword(cookie: string, newPassword = NEW_PASSWORD) {
  return harness.post('/api/auth/42/password').set('Cookie', cookie).send({ newPassword });
}

function signIn(email: string, password: string) {
  return harness.post('/api/auth/login').send({ email, password });
}

function setCookieLines(headers: Record<string, string | string[] | undefined>): string {
  return [headers['set-cookie'] ?? []].flat().join(';');
}

async function connectedStudent(): Promise<TestAccount> {
  const account = await createTestAccount(harness.app);
  const connected = await roundTrip(harness, account, 'link');
  expect(connected.headers.location).toBe('/me?oauth=connected');
  return account;
}

async function confirmWith42(account: TestAccount): Promise<void> {
  const confirmed = await roundTrip(harness, account, 'confirm');
  expect(confirmed.status).toBe(302);
  expect(confirmed.headers.location).toBe('/me?oauth=confirmed');
}

describe('a password is set without the current one only within a fresh Confirm with 42', () => {
  it('refuses the request without a confirmation', async () => {
    const account = await connectedStudent();

    const refused = await setPassword(account.cookie);
    expect(refused.body).toMatchObject({ ok: false, error: { code: 'confirmation_required' } });

    expect((await signIn(account.email, account.password)).body).toMatchObject({ ok: true });
  }, 20_000);

  it('refuses the request eleven minutes after the confirmation', async () => {
    const account = await connectedStudent();
    await confirmWith42(account);

    harness.clock.advance(11 * MINUTE_MS);
    const refused = await setPassword(account.cookie);
    expect(refused.body).toMatchObject({ ok: false, error: { code: 'confirmation_required' } });

    expect((await signIn(account.email, account.password)).body).toMatchObject({ ok: true });
  }, 20_000);

  it('sets the password once within ten minutes and signs the Student out everywhere', async () => {
    const account = await connectedStudent();
    await confirmWith42(account);
    harness.clock.advance(9 * MINUTE_MS);

    harness.barriers.arm('password-change:first-sign-out');
    const setting = setPassword(account.cookie).then((res) => res);
    await harness.barriers.waitFor('password-change:first-sign-out', 1);
    const second = await setPassword(account.cookie, 'another-password-2');
    expect(second.body).toMatchObject({ ok: false, error: { code: 'confirmation_required' } });
    harness.barriers.release('password-change:first-sign-out');
    harness.barriers.disarm('password-change:first-sign-out');

    const set = await setting;
    expect(set.body).toMatchObject({ ok: true });
    expect(setCookieLines(set.headers)).toContain('Max-Age=0');

    const prisma = harness.app.get(PrismaService);
    expect(await prisma.session.findMany({ where: { studentId: account.id } })).toEqual([]);
    expect(harness.recorder.events.filter((event) => event.event === 'revokeSessions')).toHaveLength(2);

    const old = await signIn(account.email, account.password);
    expect(old.body).toMatchObject({ ok: false, error: { code: 'password_incorrect' } });
    expect((await signIn(account.email, NEW_PASSWORD)).body).toMatchObject({ ok: true });
  }, 20_000);
});
