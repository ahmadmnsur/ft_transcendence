import { expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { MatchingService } from '../../src/matching/matching.service';
import { useHarness } from '../harness/app';
import { reviewedMatch } from '../harness/reviews';

const harness = useHarness();
const actor = (studentId: string) => ({ studentId, sessionHash: null });

function keysIn(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...keysIn(child)]);
}

it('records only the Mentor reading received feedback, for one Match or all, without exposing it to the Mentee', async () => {
  const { matchId, reviewId, mentor, mentee, admin } = await reviewedMatch(harness.app);
  const matching = harness.app.get(MatchingService);
  await matching.closeRound(actor(admin.id));
  await matching.openRound(actor(admin.id));
  const second = await matching.createHandMadeMatch(actor(admin.id), [mentor.id, mentee.id]);
  await matching.accept(actor(mentor.id), second.id);
  await matching.accept(actor(mentee.id), second.id);
  const submitted = await harness.post(`/api/matches/${second.id}/review`).set('Cookie', mentee.cookie).send({
    learningOutcome: { learned: 'How a layer cache works.', canNowDo: 'Order another Dockerfile.' },
    privateFeedback: { answerUsefulness: 'Useful again.', answerExplanation: 'Clear examples again.' },
    publicTakeaway: 'Cache dependencies before copying source files.',
  }).expect(201);
  const prisma = harness.app.get(PrismaService);
  const feedback = () => prisma.privateFeedback.findMany({
    where: { review: { match: { mentorId: mentor.id } } },
    orderBy: { reviewId: 'asc' }, select: { reviewId: true, readAt: true },
  });
  const menteeOpened = await harness.post('/api/me/new-dots/opened').set('Cookie', mentee.cookie)
    .send({ page: 'feedback', matchId }).expect(201);
  expect((await feedback()).every((row) => row.readAt === null)).toBe(true);

  harness.clock.stopAt(harness.clock.now());
  const firstRead = harness.clock.now();
  await harness.post('/api/me/new-dots/opened').set('Cookie', mentor.cookie)
    .send({ page: 'feedback', matchId }).expect(201);
  const one = await feedback();
  expect(one.find((row) => row.reviewId === reviewId)?.readAt).toEqual(firstRead);
  expect(one.find((row) => row.reviewId === submitted.body.data.reviewId)?.readAt).toBeNull();

  harness.clock.advance(1_000);
  const allRead = harness.clock.now();
  await harness.post('/api/me/new-dots/opened').set('Cookie', mentor.cookie)
    .send({ page: 'feedback' }).expect(201);
  const all = await feedback();
  expect(all.find((row) => row.reviewId === reviewId)?.readAt).toEqual(firstRead);
  expect(all.find((row) => row.reviewId === submitted.body.data.reviewId)?.readAt).toEqual(allRead);

  const bodies: unknown[] = [submitted.body, menteeOpened.body];
  for (const path of [
    `/api/matches/${matchId}`, `/api/matches/${second.id}`, '/api/matches', '/api/matches/current',
    '/api/me/feedback-received', '/api/me/new-dots', '/api/session',
  ]) {
    const response = await harness.get(path).set('Cookie', mentee.cookie).expect(200);
    bodies.push(response.body);
  }
  const received = await harness.get('/api/me/feedback-received').set('Cookie', mentor.cookie).expect(200);
  bodies.push(received.body);
  const keys = bodies.flatMap(keysIn);
  expect(keys.filter((key) => key === 'readAt' || key === 'read_at' || /^(messages|match|friends|prompts|reports|feed)(OpenedAt|_opened_at)$/.test(key))).toEqual([]);
}, 30_000);
