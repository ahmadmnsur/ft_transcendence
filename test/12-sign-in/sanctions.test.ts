import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { useHarness } from '../harness/app';
import { createTestAccount } from '../harness/accounts';

const harness = useHarness();

describe('sanctions are told only after the right password', () => {
  it('a Suspended Student gets password_incorrect for a wrong password, account_suspended for the right one', async () => {
    const account = await createTestAccount(harness.app);
    await harness.app.get(PrismaService).student.update({
      where: { id: account.id },
      data: { suspendedAt: new Date() },
    });

    const wrong = await harness
      .post('/api/auth/login')
      .send({ email: account.email, password: 'a-wrong-password-1' });
    expect(wrong.status).toBe(200);
    expect(wrong.body).toEqual({
      ok: false,
      error: { code: 'password_incorrect', message: 'Wrong password.' },
    });

    const right = await harness
      .post('/api/auth/login')
      .send({ email: account.email, password: account.password });
    expect(right.status).toBe(200);
    expect(right.body).toEqual({
      ok: false,
      error: { code: 'account_suspended', message: 'Your account is suspended. Contact an Admin.' },
    });
  });

  it('a Removed Student gets password_incorrect for a wrong password, account_removed for the right one', async () => {
    const account = await createTestAccount(harness.app);
    await harness.app.get(PrismaService).student.update({
      where: { id: account.id },
      data: { removedAt: new Date() },
    });

    const wrong = await harness
      .post('/api/auth/login')
      .send({ email: account.email, password: 'a-wrong-password-1' });
    expect(wrong.status).toBe(200);
    expect(wrong.body).toEqual({
      ok: false,
      error: { code: 'password_incorrect', message: 'Wrong password.' },
    });

    const right = await harness
      .post('/api/auth/login')
      .send({ email: account.email, password: account.password });
    expect(right.status).toBe(200);
    expect(right.body).toEqual({
      ok: false,
      error: { code: 'account_removed', message: "This account was removed and can't sign in again." },
    });
  });
});
