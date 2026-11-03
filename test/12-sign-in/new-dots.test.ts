import { expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { MessagingService } from '../../src/messaging/messaging.service';
import { createTestAccount } from '../harness/accounts';
import { useHarness } from '../harness/app';

const harness = useHarness();
const actor = (studentId: string) => ({ studentId, sessionHash: null });

it('clears Messages for this sign-in, shows a newer message, and restores an older unread message on a new sign-in', async () => {
  const recipient = await createTestAccount(harness.app);
  const a = await createTestAccount(harness.app);
  const b = await createTestAccount(harness.app);
  const messaging = harness.app.get(MessagingService);
  const login = await harness.post('/api/auth/login')
    .send({ email: recipient.email, password: recipient.password }).expect(201);
  const cookie = [login.headers['set-cookie']].flat().map((value: string) => value.split(';')[0]).join('; ');
  const first = await messaging.send(actor(a.id), recipient.id, 'The first message.');
  harness.clock.stopAt(new Date(first.createdAt));
  harness.recorder.clear();

  const waiting = await harness.get('/api/me/new-dots').set('Cookie', cookie).expect(200);
  expect(waiting.body.data.messages).toBe(true);
  const opened = await harness.post('/api/me/new-dots/opened').set('Cookie', cookie)
    .send({ page: 'messages' }).expect(201);
  expect(opened.body.data.messages).toBe(false);
  const cleared = await harness.get('/api/me/new-dots').set('Cookie', cookie).expect(200);
  expect(cleared.body.data.messages).toBe(false);

  harness.clock.advance(1_000);
  await messaging.send(actor(b.id), recipient.id, 'The second message.');
  const newer = await harness.get('/api/me/new-dots').set('Cookie', cookie).expect(200);
  expect(newer.body.data.messages).toBe(true);
  await harness.post(`/api/messages/threads/${b.id}/read`).set('Cookie', cookie).send({}).expect(200);
  const handled = await harness.get('/api/me/new-dots').set('Cookie', cookie).expect(200);
  expect(handled.body.data.messages).toBe(false);

  await harness.post('/api/auth/logout').set('Cookie', cookie).send({}).expect(200);
  const signedInAgain = await harness.post('/api/auth/login')
    .send({ email: recipient.email, password: recipient.password }).expect(201);
  const freshCookie = [signedInAgain.headers['set-cookie']].flat()
    .map((value: string) => value.split(';')[0]).join('; ');
  const fresh = await harness.get('/api/me/new-dots').set('Cookie', freshCookie).expect(200);
  expect(fresh.body.data.messages).toBe(true);
  const unread = await harness.app.get(PrismaService).directMessage.findMany({
    where: { recipientId: recipient.id, readAt: null }, select: { id: true },
  });
  expect(unread).toEqual([{ id: first.id }]);
}, 20_000);
