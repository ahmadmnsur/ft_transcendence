import { describe, expect, it } from 'vitest';
import {
  FortyTwoClient,
  type FortyTwoIdentity,
  type TokenAnswer,
} from '../../src/auth/forty-two-client';
import { PrismaService } from '../../src/core/prisma.service';
import { useHarness } from '../harness/app';
import { createTestAccount } from '../harness/accounts';

// The fixed `/v2/me` answer (§16.3 row 12): one 42 identity, whose `id` the
// login resolves through and whose `email` another Student takes.
const FIXED_ID = 42424242;
const FIXED_EMAIL = 'fixed_login@42.example';

// The token exchange and `/v2/me` are replaced by fixed answers (§16.3 row
// 12); the authorize URL and everything else stay the real code. `identity`
// answers `login` and `email` only when the caller asked for them, mirroring
// §5.6 A step 7's read.
class FixedFortyTwoClient extends FortyTwoClient {
  override async exchangeCode(): Promise<TokenAnswer> {
    return { accessToken: 'fixed-access-token', secretValidUntil: null };
  }

  override async identity(
    accessToken: string,
    options: { withProfile: boolean },
  ): Promise<FortyTwoIdentity> {
    return {
      id: FIXED_ID,
      login: options.withProfile ? 'fixed_login' : '',
      email: options.withProfile ? FIXED_EMAIL : '',
    };
  }
}

const harness = useHarness({
  env: { FT_OAUTH_CLIENT_ID: 'test-42-client-id', FT_OAUTH_CLIENT_SECRET: 'test-42-client-secret' },
  overrides: (builder) => builder.overrideProvider(FortyTwoClient).useClass(FixedFortyTwoClient),
});

// Only the `pc_session=…` pairs, as a browser would send them: a
// `Set-Cookie` line carries attributes (`Max-Age`, `Path`, …) that a
// `Cookie` header never carries.
function setCookies(headers: Record<string, string | string[] | undefined>): string {
  return [headers['set-cookie'] ?? []]
    .flat()
    .map((line) => (line.includes(';') ? line.slice(0, line.indexOf(';')) : line))
    .filter((pair) => pair.startsWith('pc_session='))
    .join('; ');
}

function authorizeUrl(body: unknown): string {
  const url = (body as { data?: { authorizeUrl?: unknown } }).data?.authorizeUrl;
  if (typeof url !== 'string') throw new Error('start42: no authorize_url.');
  return url;
}

function stateOf(body: unknown): string {
  const state = new URL(authorizeUrl(body)).searchParams.get('state');
  if (state === null || state === '') throw new Error('start42: no state.');
  return state;
}

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
    const started = await harness
      .post('/api/auth/42/start')
      .set('Cookie', A.cookie)
      .send({ intent: 'link', password: A.password });
    expect(started.body).toMatchObject({ ok: true });
    const state = stateOf(started.body);
    const connected = await harness
      .get(`/api/auth/42/callback?code=fixed-code&state=${encodeURIComponent(state)}`)
      .set('Cookie', A.cookie);
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
    const state2 = stateOf(first.body);
    const finished = await harness
      .get(`/api/auth/42/callback?code=fixed-code&state=${encodeURIComponent(state2)}`)
      .set('Cookie', setCookies(first.headers));
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
