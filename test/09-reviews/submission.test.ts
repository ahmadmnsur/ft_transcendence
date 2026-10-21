import { expect, it } from 'vitest';
import { insertCatalogue } from '../../prisma/seed/catalogue';
import { UnitOfWork } from '../../src/core/uow';
import { MatchingService } from '../../src/matching/matching.service';
import { ReviewsService } from '../../src/reviews/reviews.service';
import { StudentsService } from '../../src/students/students.service';
import { createTestAccount, createTestStaff, openTestSession } from '../harness/accounts';
import { useHarness } from '../harness/app';

const harness = useHarness();
const actor = (studentId: string) => ({ studentId, sessionHash: null });
const input = {
  learningOutcome: { learned: 'How an index works.', canNowDo: 'Read an index plan.' },
  privateFeedback: { answerUsefulness: 'Very useful.', answerExplanation: 'Clear examples.', rating: 4 },
  publicTakeaway: 'An index avoids scanning every row.',
};

async function acceptedMatch() {
  const matching = harness.app.get(MatchingService);
  const students = harness.app.get(StudentsService);
  const skills = await insertCatalogue(harness.app.get(UnitOfWork));
  const admin = actor((await createTestStaff(harness.app, 'ADMIN')).id);
  const mentorAccount = await createTestAccount(harness.app);
  const menteeAccount = await createTestAccount(harness.app);
  const mentor = actor(mentorAccount.id);
  const mentee = actor(menteeAccount.id);
  await students.setSkills(mentor, [skills.get('Docker')!], []);
  await students.setSkills(mentee, [], [skills.get('Docker')!]);
  await matching.openRound(admin);
  const match = (await matching.currentMatch(mentee)).match!;
  await matching.accept(mentor, match.id);
  await matching.accept(mentee, match.id);
  harness.recorder.clear();
  return {
    matching,
    reviews: harness.app.get(ReviewsService),
    admin,
    mentor,
    mentee,
    mentorAccount,
    menteeAccount,
    id: match.id,
  };
}

it('commits one immutable Review, Private Feedback and public Takeaway under duplicate submission', async () => {
  const { reviews, matching, mentor, mentee, id } = await acceptedMatch();
  harness.barriers.arm('review.submit');
  const settle = (work: Promise<unknown>) =>
    work.then(
      () => 'ok',
      (e) => e.code,
    );
  const first = settle(reviews.submitReview(mentee, id, input));
  const second = settle(reviews.submitReview(mentee, id, input));
  await harness.barriers.waitFor('review.submit', 2);
  expect(harness.recorder.events).toEqual([]);
  harness.barriers.disarm('review.submit');
  harness.barriers.releaseAll('review.submit');
  expect((await Promise.all([first, second])).sort()).toEqual(['already_reviewed', 'ok']);
  const detail = await matching.getMatch(mentee, id);
  expect(detail.status).toBe('COMPLETED');
  expect(detail.review).toMatchObject(input.learningOutcome);
  expect(detail.privateFeedback).toMatchObject(input.privateFeedback);
  expect(await reviews.listFeedbackReceived(mentor, 1, 20)).toMatchObject({
    total: 1,
    items: [{ matchId: id, ...input.privateFeedback }],
  });
  expect(harness.recorder.events).toHaveLength(1);
  expect(harness.recorder.events[0]).toMatchObject({
    event: 'postCreated',
    args: [
      {
        origin: 'TAKEAWAY',
        body: input.publicTakeaway,
        author: { id: mentee.studentId },
        likeCount: 0,
        likedByMe: false,
      },
    ],
  });
  expect(JSON.stringify(harness.recorder.events)).not.toContain(mentor.studentId);
});

for (const competing of ['close', 'decline'] as const) {
  for (const first of ['review', 'terminal'] as const) {
    it(`Review versus ${competing}, ${first} first: one serial ending and no partial Review`, async () => {
      const { reviews, matching, admin, mentor, mentee, id } = await acceptedMatch();
      const terminalCheckpoint = competing === 'close' ? 'round.close' : 'match.decline';
      harness.barriers.arm('review.submit');
      harness.barriers.arm(terminalCheckpoint);
      const settle = (work: Promise<unknown>) =>
        work.then(
          () => 'ok',
          (e) => e.code,
        );
      const review = settle(reviews.submitReview(mentee, id, input));
      const terminal = settle(
        competing === 'close' ? matching.closeRound(admin) : matching.decline(mentor, id),
      );
      await harness.barriers.waitFor('review.submit', 1);
      await harness.barriers.waitFor(terminalCheckpoint, 1);
      harness.barriers.disarm('review.submit');
      harness.barriers.disarm(terminalCheckpoint);
      harness.barriers.release(first === 'review' ? 'review.submit' : terminalCheckpoint);
      expect(await (first === 'review' ? review : terminal)).toBe('ok');
      harness.barriers.release(first === 'review' ? terminalCheckpoint : 'review.submit');
      expect(await review).toBe(first === 'review' ? 'ok' : 'match_not_reviewable');
      expect(await terminal).toBe(
        first === 'review' && competing === 'decline' ? 'match_not_in_progress' : 'ok',
      );
      const detail = await matching.getMatch(mentee, id);
      expect(detail.status).toBe(
        first === 'review' ? 'COMPLETED' : competing === 'close' ? 'LAPSED' : 'DECLINED',
      );
      expect(detail.review === null).toBe(first !== 'review');
      expect(detail.privateFeedback === null).toBe(first !== 'review');
      const received = await reviews.listFeedbackReceived(mentor, 1, 20);
      expect(received.total).toBe(first === 'review' ? 1 : 0);
      expect(harness.recorder.events.filter((e) => e.event === 'postCreated')).toHaveLength(
        first === 'review' ? 1 : 0,
      );
    });
  }
}

it('keeps the three readerships separate, including promotion and a Removed author', async () => {
  const { reviews, matching, admin, mentor, mentee, mentorAccount, menteeAccount, id } =
    await acceptedMatch();
  const outsider = await createTestAccount(harness.app);
  const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
  const adminCookie = await openTestSession(harness.app, { id: admin.studentId });
  const post = (cookie: string) =>
    harness.post(`/api/matches/${id}/review`).set('Cookie', cookie).send(input);
  expect((await post(mentorAccount.cookie)).status).toBe(403);
  expect((await post(outsider.cookie)).status).toBe(404);
  expect((await post(adminCookie)).status).toBe(404);
  expect((await harness.get(`/api/matches/${id}`).set('Cookie', adminCookie)).status).toBe(404);
  expect((await harness.get(`/api/admin/matches/${id}`).set('Cookie', moderator.cookie)).status).toBe(403);
  // Fixture promotion: the role-management paths join in their own ticket.
  await harness.app.get(UnitOfWork).run('fixture-promotion', async (tx) => {
    await tx.student.update({ where: { id: mentee.studentId }, data: { role: 'ADMIN' } });
  });
  expect((await post(menteeAccount.cookie)).status).toBe(201);
  for (const cookie of [menteeAccount.cookie, mentorAccount.cookie]) {
    const detail = await harness.get(`/api/matches/${id}`).set('Cookie', cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({
      review: input.learningOutcome,
      privateFeedback: input.privateFeedback,
    });
  }
  expect((await harness.get(`/api/admin/matches/${id}`).set('Cookie', adminCookie)).body.data).toMatchObject({
    review: input.learningOutcome,
    privateFeedback: input.privateFeedback,
  });
  for (const cookie of [outsider.cookie, moderator.cookie]) {
    expect((await harness.get(`/api/matches/${id}`).set('Cookie', cookie)).status).toBe(404);
    expect((await harness.get('/api/me/feedback-received').set('Cookie', cookie)).body.data).toEqual({
      total: 0,
      items: [],
    });
  }
  expect((await reviews.listFeedbackReceived(mentor, 2, 1)).items).toEqual([]);
  // Removal preserves the testimony but replaces the author's identity.
  await harness.app.get(UnitOfWork).run('fixture-removal', async (tx, ctx) => {
    await tx.student.update({ where: { id: mentee.studentId }, data: { removedAt: ctx.now } });
  });
  const received = await reviews.listFeedbackReceived(mentor, 1, 20);
  expect(received.items[0].author).toEqual({
    id: mentee.studentId,
    displayName: 'Former student',
    avatarUrl: null,
    isAdmin: false,
    removed: true,
  });
  expect(received.items[0]).toMatchObject(input.privateFeedback);
  expect((await matching.getMatch(mentor, id)).review).toMatchObject(input.learningOutcome);
  expect((await harness.get('/api/me/feedback-received')).status).toBe(401);
});

it('validates nested Review text and optional integer rating before writing anything', async () => {
  const { mentor, menteeAccount, id, reviews } = await acceptedMatch();
  const invalid = [
    {},
    { ...input, learningOutcome: null },
    { ...input, learningOutcome: { ...input.learningOutcome, learned: '   ' } },
    { ...input, learningOutcome: { ...input.learningOutcome, canNowDo: 'x'.repeat(2001) } },
    { ...input, privateFeedback: { ...input.privateFeedback, answerExplanation: 'bad\ttext' } },
    ...[null, 0, 6, 2.5, '4'].map((rating) => ({
      ...input,
      privateFeedback: { ...input.privateFeedback, rating },
    })),
    { ...input, publicTakeaway: 'A\nB' },
    { ...input, publicTakeaway: 'x'.repeat(281) },
    { ...input, privateFeedback: { ...input.privateFeedback, secret: 'extra' } },
  ];
  for (const body of invalid) {
    const response = await harness
      .post(`/api/matches/${id}/review`)
      .set('Cookie', menteeAccount.cookie)
      .send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_failed');
  }
  expect((await reviews.listFeedbackReceived(mentor, 1, 20)).total).toBe(0);
  expect(harness.recorder.events).toEqual([]);
  const { rating: _rating, ...noRating } = input.privateFeedback;
  const response = await harness
    .post(`/api/matches/${id}/review`)
    .set('Cookie', menteeAccount.cookie)
    .send({
      ...input,
      learningOutcome: { learned: '  ف'.repeat(2000) + '  ', canNowDo: '  It works.\nA plan.  ' },
      privateFeedback: noRating,
    });
  // The outcome above is too long after trimming; no characters are silently truncated.
  expect(response.status).toBe(400);
  const valid = await harness
    .post(`/api/matches/${id}/review`)
    .set('Cookie', menteeAccount.cookie)
    .send({
      ...input,
      learningOutcome: { learned: '  ف'.trim().repeat(2000), canNowDo: '  It works.\nA plan.  ' },
      privateFeedback: noRating,
    });
  expect(valid.status).toBe(201);
  expect((await reviews.listFeedbackReceived(mentor, 1, 20)).items[0].rating).toBeNull();
});

it('pages every received feedback newest first, including equal timestamps, without an aggregate', async () => {
  const { reviews, matching, admin, mentor, mentee, id } = await acceptedMatch();
  harness.clock.stopAt(new Date('2026-10-21T09:00:00Z'));
  await reviews.submitReview(mentee, id, input);
  await matching.closeRound(admin);
  await matching.openRound(admin);
  const second = await matching.createHandMadeMatch(admin, [mentor.studentId, mentee.studentId]);
  await matching.accept(mentor, second.id);
  await matching.accept(mentee, second.id);
  // Orientation can change when progress is added later; submit as the actual Mentee.
  const secondMentee = { studentId: second.mentee.id, sessionHash: null };
  expect(secondMentee.studentId).toBe(mentee.studentId);
  await reviews.submitReview(secondMentee, second.id, {
    ...input,
    privateFeedback: { ...input.privateFeedback, rating: 2 },
  });
  const newest = await reviews.listFeedbackReceived(mentor, 1, 1);
  const oldest = await reviews.listFeedbackReceived(mentor, 2, 1);
  expect(newest.total).toBe(2);
  expect(newest.items.map((item) => [item.matchId, item.rating, item.roundNumber])).toEqual([
    [second.id, 2, 2],
  ]);
  expect(oldest.items.map((item) => [item.matchId, item.rating, item.roundNumber])).toEqual([[id, 4, 1]]);
  expect(Object.keys(newest).sort()).toEqual(['items', 'total']);
  expect(Object.keys(newest.items[0]).sort()).toEqual([
    'answerExplanation',
    'answerUsefulness',
    'author',
    'createdAt',
    'matchId',
    'rating',
    'roundNumber',
  ]);
});
