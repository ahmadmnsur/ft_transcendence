import { afterEach, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { AdminUsersService } from '../../src/admin/admin-users.service';
import { AppConfig } from '../../src/core/app-config';
import { RealtimePublisher } from '../../src/core/realtime-publisher';
import { PresenceRegistry } from '../../src/realtime/presence-registry';
import { RealtimeGateway } from '../../src/realtime/realtime.gateway';
import { SOCKET_PATH } from '../../src/realtime/socket-io.adapter';
import { createTestAccount, createTestStaff, type TestAccount } from '../harness/accounts';
import { useHarness } from '../harness/app';
import { createTestPost, fileTestReport } from '../harness/reports';

const harness = useHarness({
  overrides: (builder) => builder.overrideProvider(RealtimePublisher).useFactory({
    factory: (gateway: RealtimeGateway) => gateway,
    inject: [RealtimeGateway],
  }),
});

const opened: Socket[] = [];

async function connect(account: TestAccount, reports: unknown[]): Promise<Socket> {
  const socket = io(harness.baseUrl, {
    path: SOCKET_PATH,
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    autoConnect: false,
    timeout: 3000,
    extraHeaders: { Origin: harness.app.get(AppConfig).publicOrigin, Cookie: account.cookie },
  });
  opened.push(socket);
  socket.on('reports:changed', (payload: unknown) => reports.push(payload));
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
    socket.connect();
  });
  await expect.poll(() => harness.app.get(PresenceRegistry).isOnline(account.id)).toBe(true);
  return socket;
}

async function roundTrip(socket: Socket): Promise<void> {
  const ack: unknown = await socket.timeout(3000).emitWithAck('dm:send', {});
  expect(ack).toMatchObject({ ok: false, error: { code: 'validation_failed' } });
}

it('sends reports:changed to staff only, and a demoted Peer Moderator stops hearing it on the same socket', async () => {
  const student = await createTestAccount(harness.app);
  const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
  const admin = await createTestStaff(harness.app, 'ADMIN');
  const author = await createTestAccount(harness.app);
  const studentReports: unknown[] = [];
  const moderatorReports: unknown[] = [];
  const adminReports: unknown[] = [];
  const studentSocket = await connect(student, studentReports);
  const moderatorSocket = await connect(moderator, moderatorReports);
  const adminSocket = await connect(admin, adminReports);
  const moderatorSocketId = moderatorSocket.id;
  expect(harness.app.get(RealtimePublisher)).toBe(harness.app.get(RealtimeGateway));

  const first = await createTestPost(harness.app, author.id);
  const received = new Promise<unknown>((resolve) => moderatorSocket.once('reports:changed', resolve));
  await fileTestReport(harness.app, student.id, { postId: first });
  expect(await received).toEqual({});
  await expect.poll(() => adminReports.length).toBe(1);
  await roundTrip(studentSocket);
  expect(studentReports).toEqual([]);
  expect(moderatorReports).toEqual([{}]);

  const users = harness.app.get(AdminUsersService);
  await users.changeRole({ studentId: admin.id, sessionHash: null }, moderator.id, 'STUDENT');
  const second = await createTestPost(harness.app, author.id);
  const changed = new Promise<unknown>((resolve) => adminSocket.once('reports:changed', resolve));
  await fileTestReport(harness.app, student.id, { postId: second });
  expect(await changed).toEqual({});
  await roundTrip(studentSocket);
  await roundTrip(moderatorSocket);
  expect(studentReports).toEqual([]);
  expect(moderatorReports).toEqual([{}]);
  expect(moderatorSocket.connected).toBe(true);
  expect(moderatorSocket.id).toBe(moderatorSocketId);
});

afterEach(() => {
  for (const socket of opened.splice(0)) socket.disconnect();
});
