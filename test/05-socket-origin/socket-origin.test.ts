import { afterEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { AppConfig } from '../../src/core/app-config';
import { PrismaService } from '../../src/core/prisma.service';
import { SESSION_COOKIE_NAME, hashSessionToken, sessionCookieHeader } from '../../src/core/session-cookie';
import { SOCKET_PATH } from '../../src/realtime/socket-io.adapter';
import { createTestAccount, type TestAccount } from '../harness/accounts';
import { useHarness } from '../harness/app';

const harness = useHarness();

// §16.3 row 5, the whole category: §7.2 step 1's byte-equal Origin gate —
// exact accepted, absent, `null` and mismatched refused, each with a real
// valid session and each leaving its row untouched — §7.2 step 2's
// `unauthorized`, and §7.1's WebSocket-only transport, refused on HTTP and
// unable to connect as a client transport.
describe('socket origin admission', () => {
  it('accepts the exact Origin with a valid session', async () => {
    const account = await createTestAccount(harness.app);
    const outcome = await handshake({ origin: publicOrigin(), cookie: account.cookie });
    expect(outcome).toEqual({ connected: true, message: null });
  });

  it('refuses an absent Origin even with a valid session', async () => {
    const account = await createTestAccount(harness.app);
    await expectRefused(account, undefined);
  });

  it("refuses the literal 'null' Origin even with a valid session", async () => {
    const account = await createTestAccount(harness.app);
    await expectRefused(account, 'null');
  });

  it('refuses a mismatched Origin even with a valid session', async () => {
    const account = await createTestAccount(harness.app);
    const origin = publicOrigin();
    const url = new URL(origin);
    const otherPort = `${url.protocol}//${url.hostname}:${Number(url.port === '' ? 80 : url.port) + 1}`;
    // Byte-equality (§7.2 step 1): a trailing slash and different case are
    // mismatches too, not spellings of the origin.
    for (const mismatched of [otherPort, `${origin}/`, origin.toUpperCase()]) {
      await expectRefused(account, mismatched);
    }
  });

  it('refuses long-polling at the HTTP endpoint', async () => {
    const account = await createTestAccount(harness.app);
    const response = await harness
      .get(`${SOCKET_PATH}/?EIO=4&transport=polling`)
      .set('Origin', publicOrigin())
      .set('Cookie', account.cookie);
    expect(response.status).toBe(400);
    expect(response.text).not.toContain('sid');
  });

  it('never connects with polling as the only transport', async () => {
    const account = await createTestAccount(harness.app);
    const outcome = await handshake({
      origin: publicOrigin(),
      cookie: account.cookie,
      transports: ['polling'],
    });
    expect(outcome.connected).toBe(false);
    // The server refused the request; this is not the client's own timeout.
    expect(outcome.message).not.toBe('timeout');
  });

  it('answers unauthorized without a session cookie', async () => {
    const outcome = await handshake({ origin: publicOrigin() });
    expect(outcome).toEqual({ connected: false, message: 'unauthorized' });
  });

  it('answers unauthorized for an unknown session token', async () => {
    const outcome = await handshake({
      origin: publicOrigin(),
      cookie: sessionCookieHeader('no-such-token-0123456789'),
    });
    expect(outcome).toEqual({ connected: false, message: 'unauthorized' });
  });
});

type Handshake = { connected: boolean; message: string | null };

const opened: Socket[] = [];

// The Node client's `extraHeaders` are sent verbatim, so `Origin` and `Cookie`
// reach the server exactly as given — which is what makes the gate's
// byte-equality testable from here (§7.1: the cookie travels with the
// handshake; there is no token). `forceNew` keeps each attempt on its own
// connection, and `reconnection: false` makes one refusal final.
function handshake(options: {
  origin?: string;
  cookie?: string;
  transports?: Array<'polling' | 'websocket'>;
}): Promise<Handshake> {
  const headers: Record<string, string> = {};
  if (options.origin !== undefined) headers.Origin = options.origin;
  if (options.cookie !== undefined) headers.Cookie = options.cookie;
  const socket = io(harness.baseUrl, {
    path: SOCKET_PATH,
    transports: options.transports ?? ['websocket'],
    reconnection: false,
    forceNew: true,
    timeout: 3000,
    extraHeaders: headers,
  });
  opened.push(socket);
  return new Promise((resolve) => {
    socket.once('connect', () => resolve({ connected: true, message: null }));
    socket.once('connect_error', (error: Error) => resolve({ connected: false, message: error.message }));
  });
}

// A refused handshake still used a valid session: it must not connect, must
// fail at the Origin gate rather than the session middleware, and must leave
// the session row exactly as it found it (§7.2 step 1, criterion 2).
async function expectRefused(account: TestAccount, origin: string | undefined): Promise<void> {
  const before = await sessionExpiry(account.cookie);
  expect(before).not.toBeNull();

  const outcome = await handshake({ origin, cookie: account.cookie });
  expect(outcome.connected).toBe(false);
  expect(outcome.message).not.toBe('unauthorized');

  expect(await sessionExpiry(account.cookie)).toBe(before);
}

// The row's `expires_at`, found through the same hash the server reads (§5.3):
// no renewal may rewrite it on a handshake.
async function sessionExpiry(cookie: string): Promise<string | null> {
  const token = cookie.slice(`${SESSION_COOKIE_NAME}=s.`.length);
  const row = await harness.app
    .get(PrismaService)
    .session.findUnique({ where: { id: hashSessionToken(token) }, select: { expiresAt: true } });
  return row === null ? null : row.expiresAt.toISOString();
}

function publicOrigin(): string {
  return harness.app.get(AppConfig).publicOrigin;
}

afterEach(() => {
  for (const socket of opened.splice(0)) socket.disconnect();
});
