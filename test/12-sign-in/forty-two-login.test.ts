import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { useHarness } from '../harness/app';
import { createTestAccount } from '../harness/accounts';
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

// §16.3 row 12: a 42 login finds its Student only by `forty_two_id`. Student
// A connects the fixed 42 account through the real boundary, then another
// Student takes the email the fixed answer returns; a signed-out 42 login
// with that account must reach the Student who connected it, never the one
// whose email matches and never the sign-up draft. The Admin edit of the row
// belongs to Users table and roles (#65), whose PR switches this step to it;
// until then the check edits the email with the Student's own email edit,
// which #40's page builds (§6.2).
describe('a 42 login finds its Student only by forty_two_id', () => {
  it('reaches the connected Student after another Student takes the 42 email', async () => {
    const A = await createTestAccount(harness.app);

    // Connect 42: A starts the flow with their password and finishes the
    // callback that their browser would carry back, session cookie along.
    const connected = await roundTrip(harness, A, 'link');
    expect(connected.status).toBe(302);
    expect(connected.headers.location).toBe('/me?oauth=connected');

    const prisma = harness.app.get(PrismaService);
    expect(await prisma.student.findUnique({ where: { id: A.id }, select: { fortyTwoId: true } })).toEqual({
      fortyTwoId: FIXED_ID,
    });

    // The other Student takes the email the fixed answer returns.
    const B = await createTestAccount(harness.app);
    const taken = await harness.patch('/api/me').set('Cookie', B.cookie).send({ email: FIXED_EMAIL });
    expect(taken.body).toMatchObject({ ok: true });

    // A signed-out 42 login: start without any cookie, callback with the
    // `a.` cookie the start set, landing in the feed with a session cookie.
    const first = await harness.post('/api/auth/42/start').send({ intent: 'sign_in' });
    expect(first.body).toMatchObject({ ok: true });
    expect(setCookies(first.headers)).toContain('pc_session=a.');
    const finished = await callback(harness, stateOf(first.body), setCookies(first.headers));
    expect(finished.status).toBe(302);
    // The feed, not the sign-up draft: the Student exists.
    expect(finished.headers.location).toBe('/');
    expect(setCookies(finished.headers)).toContain('pc_session=s.');

    // The session resolves to the Student who connected the account, never
    // to the one whose email matches.
    const probe = await harness.get('/api/session').set('Cookie', setCookies(finished.headers));
    expect(probe.status).toBe(200);
    expect(probe.body).toMatchObject({ ok: true, data: { authenticated: true, student: { id: A.id } } });
  });
});
