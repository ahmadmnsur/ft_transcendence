import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { useHarness } from '../harness/app';
import { createTestAccount, type TestAccount } from '../harness/accounts';

const harness = useHarness();
const NEW_PASSWORD = 'a-new-password-1';

function setCookies(headers: Record<string, string | string[] | undefined>): string {
  return [headers['set-cookie'] ?? []].flat().join(';');
}

// §16.3 row 12, second check: a completed password change leaves no session
// the old password opened. A sign-in with the old password racing the change
// ends refused or signed out in every staged order: held at its own
// transaction's checkpoint, at each of the change's two sign-out
// checkpoints, and run whole while the change is held at the named pause
// `password-change:admin-update` between its first sign-out and Supabase's
// admin update.
//
// Each test disarms its barrier when it releases the staged arrival, so the
// later arrivals of the closing checks pass straight through instead of
// being held until the test times out.
describe('a sign-in with the old password racing a password change', () => {
  async function changeRequest(cookie: string, currentPassword: string) {
    return harness
      .post('/api/auth/password')
      .set('Cookie', cookie)
      .send({ currentPassword, newPassword: NEW_PASSWORD })
      .then((res) => res);
  }

  async function signIn(email: string, password: string) {
    return harness.post('/api/auth/login').send({ email, password }).then((res) => res);
  }

  // After each order: no `Session` the old password opened survives, the old
  // password is refused and the new one is accepted.
  async function expectChangedOver(account: TestAccount): Promise<void> {
    const prisma = harness.app.get(PrismaService);
    expect(await prisma.session.findMany({ where: { studentId: account.id } })).toEqual([]);

    const old = await signIn(account.email, account.password);
    expect(old.body).toMatchObject({ ok: false, error: { code: 'password_incorrect' } });

    expect(
      harness.recorder.events.filter((event) => event.event === 'revokeSessions'),
    ).toHaveLength(2);

    const fresh = await signIn(account.email, NEW_PASSWORD);
    expect(fresh.status).toBe(201);
    expect(fresh.body).toMatchObject({ ok: true });
    expect(setCookies(fresh.headers)).toContain('pc_session=s.');
  }

  function expectSignedOut(change: {
    headers: Record<string, string | string[] | undefined>;
    body: unknown;
  }): void {
    expect(change.body).toMatchObject({ ok: true });
    // Step 4 and step 6 each signed the Student out; the cookie is cleared.
    expect(setCookies(change.headers)).toContain('Max-Age=0');
  }

  function release(name: string): void {
    harness.barriers.release(name);
    harness.barriers.disarm(name);
  }

  it('refuses a sign-in held at its checkpoint once the change commits', async () => {
    const account = await createTestAccount(harness.app);
    harness.barriers.arm('sign-in');
    const racing = signIn(account.email, account.password);
    await harness.barriers.waitFor('sign-in', 1);

    const change = await changeRequest(account.cookie, account.password);
    expectSignedOut(change);

    release('sign-in');
    const raced = await racing;
    expect(raced.body).toMatchObject({ ok: false, error: { code: 'password_incorrect' } });

    await expectChangedOver(account);
  }, 20_000);

  it('signs out a sign-in that lands while the change is held at its first sign-out', async () => {
    const account = await createTestAccount(harness.app);
    harness.barriers.arm('password-change:first-sign-out');
    const changing = changeRequest(account.cookie, account.password);
    await harness.barriers.waitFor('password-change:first-sign-out', 1);

    const racing = await signIn(account.email, account.password);
    expect(racing.status).toBe(201);

    release('password-change:first-sign-out');
    expectSignedOut(await changing);

    await expectChangedOver(account);
  }, 20_000);

  it('refuses a sign-in with the old password while the change is held at its second sign-out', async () => {
    const account = await createTestAccount(harness.app);
    harness.barriers.arm('password-change:second-sign-out');
    const changing = changeRequest(account.cookie, account.password);
    await harness.barriers.waitFor('password-change:second-sign-out', 1);

    // Step 5 already set the new password at Supabase, so the old one is
    // refused there.
    const racing = await signIn(account.email, account.password);
    expect(racing.body).toMatchObject({ ok: false, error: { code: 'password_incorrect' } });

    release('password-change:second-sign-out');
    expectSignedOut(await changing);

    await expectChangedOver(account);
  }, 20_000);

  it('signs out a sign-in run whole while the change is held at password-change:admin-update', async () => {
    const account = await createTestAccount(harness.app);
    harness.barriers.arm('password-change:admin-update');
    const changing = changeRequest(account.cookie, account.password);
    await harness.barriers.waitFor('password-change:admin-update', 1);

    // Step 4 committed, but the old password still works at Supabase, so the
    // sign-in opens a session — which step 6 then deletes.
    const racing = await signIn(account.email, account.password);
    expect(racing.status).toBe(201);

    release('password-change:admin-update');
    expectSignedOut(await changing);

    await expectChangedOver(account);
  }, 20_000);
});
