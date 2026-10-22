import { expect, it } from 'vitest';
import { useHarness } from '../harness/app';
import { createTestAccount, createTestStaff } from '../harness/accounts';
import { PrismaService } from '../../src/core/prisma.service';

const harness = useHarness();

it('the third Prompt answer counts removed Posts and duplicate submissions pay and award once', async () => {
  const admin = await createTestStaff(harness.app, 'ADMIN');
  const student = await createTestAccount(harness.app);
  for (let count = 1; count <= 4; count++) {
    const prompt = await harness.post('/api/admin/prompts').set('Cookie', admin.cookie).send({ question: `Reflection ${count}?` });
    const path = `/api/prompts/${prompt.body.data.id}/answers`;
    const send = () => harness.post(path).set('Cookie', student.cookie).send({ body: 'A lesson.' }).then((r) => r);
    if (count === 3) harness.barriers.arm('prompt.answer');
    const first = send();
    if (count === 3) {
      await harness.barriers.waitFor('prompt.answer', 1);
      const duplicate = send();
      await harness.barriers.waitFor('prompt.answer', 2);
      harness.barriers.disarm('prompt.answer');
      harness.barriers.release('prompt.answer');
      expect((await first).status).toBe(201);
      harness.barriers.release('prompt.answer');
      expect((await duplicate).body.error.code).toBe('already_answered');
    }
    const result = await first;
    expect(result.body.data).toEqual({
      xpAwarded: 20, xp: count * 20, level: 1, xpIntoLevel: count * 20, xpForNextLevel: 250,
      badgesAwarded: count === 3 ? ['KNOWLEDGE_SHARER'] : [],
    });
    expect((await send()).body.error.code).toBe('already_answered');
    if (count === 1) {
      // The moderation path joins later; removal keeps the earning event.
      await harness.app.get(PrismaService).post.updateMany({ where: { authorId: student.id }, data: { removedAt: new Date() } });
    }
  }
  const progress = (await harness.get('/api/me/progress').set('Cookie', student.cookie)).body.data;
  expect(progress).toMatchObject({ xp: 80, streak: 0, badges: [{ badge: 'KNOWLEDGE_SHARER', awardedAt: expect.any(String) }] });
  expect(progress.badges).toHaveLength(1);
});

it('a duplicate answer creates one immutable Post and a retry keeps the slot used', async () => {
  const admin = await createTestStaff(harness.app, 'ADMIN');
  const student = await createTestAccount(harness.app);
  const published = await harness.post('/api/admin/prompts').set('Cookie', admin.cookie).send({ question: 'What did you learn?' });
  const path = `/api/prompts/${published.body.data.id}/answers`;
  const first = await harness.post(path).set('Cookie', student.cookie).send({ body: 'I learned to listen.' });
  expect(first.status).toBe(201);
  const retry = await harness.post(path).set('Cookie', student.cookie).send({ body: 'A different answer.' });
  expect(retry.body).toMatchObject({ ok: false, error: { code: 'already_answered' } });
  const answers = await harness.get(path).set('Cookie', admin.cookie);
  expect(answers.body.data.items).toHaveLength(1);
  expect(answers.body.data.items[0]).toMatchObject({ body: 'I learned to listen.', author: { id: student.id } });
  expect(harness.recorder.events.map((event) => event.event)).toEqual(['postCreated']);
});

it.each(['answer', 'publication'] as const)('%s first: supersession preserves history and refuses later answers', async (first) => {
  const admin = await createTestStaff(harness.app, 'ADMIN');
  const student = await createTestAccount(harness.app);
  const old = await harness.post('/api/admin/prompts').set('Cookie', admin.cookie).send({ question: 'Earlier reflection?' });
  const path = `/api/prompts/${old.body.data.id}/answers`;
  const answer = () => harness.post(path).set('Cookie', student.cookie).send({ body: 'An earlier lesson.' });
  if (first === 'answer') expect((await answer()).status).toBe(201);
  await harness.post('/api/admin/prompts').set('Cookie', admin.cookie).send({ question: 'Next reflection?' });
  const refused = await answer();
  expect(refused.body).toMatchObject({ ok: false, error: { code: 'prompt_not_live' } });
  const history = await harness.get(path).set('Cookie', student.cookie);
  expect(history.body.data.live).toBe(false);
  expect(history.body.data.items).toHaveLength(first === 'answer' ? 1 : 0);
});

it('concurrent duplicate answers produce one Post and one event', async () => {
  const admin = await createTestStaff(harness.app, 'ADMIN');
  const student = await createTestAccount(harness.app);
  const prompt = await harness.post('/api/admin/prompts').set('Cookie', admin.cookie).send({ question: 'One reflection?' });
  const path = `/api/prompts/${prompt.body.data.id}/answers`;
  harness.barriers.arm('prompt.answer');
  const answer = () => harness.post(path).set('Cookie', student.cookie).send({ body: 'One answer.' }).then((r) => r);
  const a = answer();
  await harness.barriers.waitFor('prompt.answer', 1);
  const b = answer();
  await harness.barriers.waitFor('prompt.answer', 2);
  harness.barriers.disarm('prompt.answer');
  harness.barriers.release('prompt.answer');
  expect((await a).status).toBe(201);
  harness.barriers.release('prompt.answer');
  expect((await b).body).toMatchObject({ ok: false, error: { code: 'already_answered' } });
  expect((await harness.get(path).set('Cookie', student.cookie)).body.data.items).toHaveLength(1);
  expect((await harness.get('/api/prompts/live').set('Cookie', student.cookie)).body.data.answeredByMe).toBe(true);
  expect(harness.recorder.events.map((event) => event.event)).toEqual(['postCreated']);
});

it.each(['answer', 'publication'] as const)('overlapping publication and answer, %s released first: every success fits one serial order', async (first) => {
  const admin = await createTestStaff(harness.app, 'ADMIN');
  const student = await createTestAccount(harness.app);
  const old = await harness.post('/api/admin/prompts').set('Cookie', admin.cookie).send({ question: 'Before publication?' });
  const path = `/api/prompts/${old.body.data.id}/answers`;
  harness.barriers.arm('prompt.answer');
  harness.barriers.arm('prompt.publish');
  const answer = harness.post(path).set('Cookie', student.cookie).send({ body: 'An overlapping reflection.' }).then((r) => r);
  await harness.barriers.waitFor('prompt.answer', 1);
  const publication = harness.post('/api/admin/prompts').set('Cookie', admin.cookie).send({ question: 'After publication?' }).then((r) => r);
  await harness.barriers.waitFor('prompt.publish', 1);
  harness.barriers.disarm('prompt.answer');
  harness.barriers.disarm('prompt.publish');
  harness.barriers.release(first === 'answer' ? 'prompt.answer' : 'prompt.publish');
  expect((await (first === 'answer' ? answer : publication)).body.ok).toBe(true);
  harness.barriers.release(first === 'answer' ? 'prompt.publish' : 'prompt.answer');
  expect((await publication).status).toBe(201);
  const result = await answer;
  // Overlapping transactions may choose either legal serialization order,
  // regardless of their response order (§3.6.3, ADR-0007 d1).
  if (result.body.ok) expect(result.status).toBe(201);
  else expect(result.body.error.code).toBe('prompt_not_live');
  const stored = await harness.get(path).set('Cookie', student.cookie);
  expect(stored.body.data.items).toHaveLength(result.body.ok ? 1 : 0);
  expect(stored.body.data.live).toBe(false);
  expect(harness.recorder.events.map((event) => event.event)).toEqual(result.body.ok ? ['postCreated'] : []);
  const later = await harness.post(path).set('Cookie', student.cookie).send({ body: 'After supersession.' });
  expect(later.body).toMatchObject({ ok: false, error: { code: 'prompt_not_live' } });
});

it.each(['answer', 'close'] as const)('%s commits first: answer attribution and the close Streak agree', async (first) => {
  const admin = await createTestStaff(harness.app, 'ADMIN');
  const student = await createTestAccount(harness.app);
  const prisma = harness.app.get(PrismaService);
  await prisma.student.update({ where: { id: student.id }, data: { streak: 1 } });
  const opened = await harness.post('/api/admin/rounds').set('Cookie', admin.cookie).send({});
  const prompt = await harness.post('/api/admin/prompts').set('Cookie', admin.cookie).send({ question: 'During which Round?' });
  harness.barriers.arm('prompt.answer');
  harness.barriers.arm('round.close');
  const answer = harness.post(`/api/prompts/${prompt.body.data.id}/answers`).set('Cookie', student.cookie).send({ body: 'A Round reflection.' }).then((r) => r);
  await harness.barriers.waitFor('prompt.answer', 1);
  const close = harness.post('/api/admin/rounds/current/close').set('Cookie', admin.cookie).send({}).then((r) => r);
  await harness.barriers.waitFor('round.close', 1);
  harness.barriers.disarm('prompt.answer');
  harness.barriers.disarm('round.close');
  harness.barriers.release(first === 'answer' ? 'prompt.answer' : 'round.close');
  expect((await (first === 'answer' ? answer : close)).body.ok).toBe(true);
  expect((await prisma.student.findUniqueOrThrow({ where: { id: student.id } })).streak).toBe(first === 'answer' ? 1 : 0);
  harness.barriers.release(first === 'answer' ? 'round.close' : 'prompt.answer');
  expect((await answer).body.ok).toBe(true);
  expect((await close).body.data).toEqual({
    roundId: opened.body.data.round.id, lapsed: 0,
    streaksIncremented: first === 'answer' ? 1 : 0, streaksReset: first === 'answer' ? 0 : 1,
    consistentLearnerAwarded: 0,
  });
  // The Round attribution has no public read; inspect this persistence invariant directly.
  const posts = await prisma.post.findMany({ where: { authorId: student.id } });
  expect(posts).toHaveLength(1);
  expect(posts[0].answerRoundId).toBe(first === 'answer' ? opened.body.data.round.id : null);
  expect((await prisma.student.findUniqueOrThrow({ where: { id: student.id } })).streak).toBe(first === 'answer' ? 2 : 0);
  expect(await prisma.badgeAward.count({ where: { studentId: student.id, badge: 'CONSISTENT_LEARNER' } })).toBe(0);
});

it('equal publication timestamps still leave exactly one live Prompt in durable order', async () => {
  const admin = await createTestStaff(harness.app, 'ADMIN');
  harness.clock.stopAt(new Date());
  const first = await harness.post('/api/admin/prompts').set('Cookie', admin.cookie).send({ question: 'First reflection?' });
  expect(first.status).toBe(201);
  harness.barriers.arm('prompt.publish');
  const publish = (question: string) => harness.post('/api/admin/prompts').set('Cookie', admin.cookie).send({ question }).then((r) => r);
  const a = publish('Second reflection?');
  await harness.barriers.waitFor('prompt.publish', 1);
  const b = publish('Third reflection?');
  await harness.barriers.waitFor('prompt.publish', 2);
  harness.barriers.disarm('prompt.publish');
  harness.barriers.release('prompt.publish');
  expect((await a).status).toBe(201);
  harness.barriers.release('prompt.publish');
  expect((await b).status).toBe(201);
  const history = await harness.get('/api/admin/prompts').set('Cookie', admin.cookie);
  expect(history.status).toBe(200);
  expect(history.body.data.items.map((p: { question: string; live: boolean }) => [p.question, p.live])).toEqual([
    ['Third reflection?', true], ['Second reflection?', false], ['First reflection?', false],
  ]);
  expect(new Set(history.body.data.items.map((p: { publishedAt: string }) => p.publishedAt)).size).toBe(1);
  const live = await harness.get('/api/prompts/live').set('Cookie', admin.cookie);
  expect(live.body.data.prompt.id).toBe(history.body.data.items[0].id);
  expect(harness.recorder.events).toEqual([]);
});
