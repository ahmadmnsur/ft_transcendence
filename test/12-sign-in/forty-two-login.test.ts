import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { useHarness } from '../harness/app';
import { createTestAccount, createTestStaff } from '../harness/accounts';
import {
  FIXED_EMAIL,
  FIXED_ID,
  callback,
  fixedFortyTwo,
  roundTrip,
  setCookies,
  stateOf,
} from '../harness/forty-two';

const harness = useHarness(fixedFortyTwo());

describe('a 42 login finds its Student only by forty_two_id', () => {
  it('reaches the connected Student after another Student takes the 42 email', async () => {
    const A = await createTestAccount(harness.app);

    const connected = await roundTrip(harness, A, 'link');
    expect(connected.status).toBe(302);
    expect(connected.headers.location).toBe('/me?oauth=connected');

    const prisma = harness.app.get(PrismaService);
    expect(await prisma.student.findUnique({ where: { id: A.id }, select: { fortyTwoId: true } })).toEqual({
      fortyTwoId: FIXED_ID,
    });

    const B = await createTestAccount(harness.app);
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const taken = await harness.patch(`/api/admin/students/${B.id}`).set('Cookie', admin.cookie).send({ email: FIXED_EMAIL });
    expect(taken.body).toMatchObject({ ok: true });

    const first = await harness.post('/api/auth/42/start').send({ intent: 'sign_in' });
    expect(first.body).toMatchObject({ ok: true });
    expect(setCookies(first.headers)).toContain('pc_session=a.');
    const finished = await callback(harness, stateOf(first.body), setCookies(first.headers));
    expect(finished.status).toBe(302);
    expect(finished.headers.location).toBe('/');
    expect(setCookies(finished.headers)).toContain('pc_session=s.');

    const probe = await harness.get('/api/session').set('Cookie', setCookies(finished.headers));
    expect(probe.status).toBe(200);
    expect(probe.body).toMatchObject({ ok: true, data: { authenticated: true, student: { id: A.id } } });
  });
});
