import { expect, it } from 'vitest';
import { insertCatalogue } from '../../prisma/seed/catalogue';
import { AdminUsersService } from '../../src/admin/admin-users.service';
import { PrismaService } from '../../src/core/prisma.service';
import { UnitOfWork } from '../../src/core/uow';
import { MatchingService } from '../../src/matching/matching.service';
import { PromptsService } from '../../src/prompts/prompts.service';
import { ReviewsService } from '../../src/reviews/reviews.service';
import { StudentsService } from '../../src/students/students.service';
import { createTestAccount, createTestStaff } from '../harness/accounts';
import { useHarness } from '../harness/app';

const harness = useHarness();
const actor = (studentId: string) => ({ studentId, sessionHash: null });

it('evaluates the whole Round once, freezes sanctions, and retains dated Badges through resets', async () => {
  const prisma = harness.app.get(PrismaService);
  const matching = harness.app.get(MatchingService);
  const prompts = harness.app.get(PromptsService);
  const students = harness.app.get(StudentsService);
  const admin = await createTestStaff(harness.app, 'ADMIN');
  const mentor = await createTestAccount(harness.app);
  const mentee = await createTestAccount(harness.app);
  const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
  const unreviewed = await createTestAccount(harness.app);
  const suspended = await createTestAccount(harness.app);
  const removed = await createTestAccount(harness.app);
  const inactive = await createTestAccount(harness.app);
  await prisma.student.updateMany({ where: { id: { not: inactive.id } }, data: { streak: 2 } });
  const skills = await insertCatalogue(harness.app.get(UnitOfWork));
  const skillId = skills.get('Docker')!;
  await students.setSkills(actor(mentor.id), [skillId], []);
  await students.setSkills(actor(mentee.id), [], [skillId]);
  const opened = await matching.openRound(actor(admin.id));
  const completed = (await matching.currentMatch(actor(mentee.id))).match!;
  await matching.accept(actor(mentor.id), completed.id);
  await matching.accept(actor(mentee.id), completed.id);
  await prisma.student.update({ where: { id: mentor.id }, data: { role: 'ADMIN' } });
  await harness.app.get(ReviewsService).submitReview(actor(mentee.id), completed.id, {
    learningOutcome: { learned: 'How a container works.', canNowDo: 'Run an isolated service.' },
    privateFeedback: { answerUsefulness: 'Useful examples.', answerExplanation: 'Clear explanation.' },
    publicTakeaway: 'A container isolates the service.',
  });
  await students.setSkills(actor(moderator.id), [skillId], []);
  await students.setSkills(actor(unreviewed.id), [], [skillId]);
  const pending = await matching.createHandMadeMatch(actor(admin.id), [moderator.id, unreviewed.id]);
  await matching.accept(actor(moderator.id), pending.id);
  await matching.accept(actor(unreviewed.id), pending.id);
  const prompt = await prompts.publish(actor(admin.id), 'What did this Round teach you?');
  for (const account of [mentee, moderator, suspended, removed]) {
    await prompts.answer(actor(account.id), prompt.id, 'A lesson from the Round.');
  }
  await prisma.post.updateMany({ where: { authorId: moderator.id }, data: { removedAt: new Date() } });
  const users = harness.app.get(AdminUsersService);
  await users.suspend(actor(admin.id), suspended.id);
  await users.remove(actor(admin.id), removed.id);
  const closedAt = new Date();
  harness.clock.stopAt(closedAt);
  harness.recorder.clear();
  const close = await harness.post('/api/admin/rounds/current/close').set('Cookie', admin.cookie).send({});
  expect(close.body.data).toEqual({
    roundId: opened.round.id, lapsed: 1,
    streaksIncremented: 3, streaksReset: 2, consistentLearnerAwarded: 3,
  });
  expect((await prisma.round.findUniqueOrThrow({ where: { id: opened.round.id } })).closedAt).toEqual(closedAt);
  expect((await matching.getMatch(actor(mentee.id), completed.id)).status).toBe('COMPLETED');
  expect((await matching.getMatch(actor(unreviewed.id), pending.id)).status).toBe('LAPSED');
  expect(harness.recorder.events).toEqual([{ event: 'roundClosed', args: [] }]);
  for (const account of [mentor, mentee, moderator]) {
    const progress = (await harness.get('/api/me/progress').set('Cookie', account.cookie)).body.data;
    expect(progress.streak).toBe(3);
    expect(progress.badges).toContainEqual({ badge: 'CONSISTENT_LEARNER', awardedAt: closedAt.toISOString() });
    const profile = (await harness.get(`/api/students/${account.id}`).set('Cookie', admin.cookie)).body.data.profile;
    expect(profile).toMatchObject(progress);
  }
  for (const account of [admin, unreviewed, inactive]) {
    expect((await prisma.student.findUniqueOrThrow({ where: { id: account.id } })).streak).toBe(0);
  }
  for (const account of [suspended, removed]) {
    expect((await prisma.student.findUniqueOrThrow({ where: { id: account.id } })).streak).toBe(2);
    expect(await prisma.badgeAward.count({ where: { studentId: account.id } })).toBe(0);
  }
  const retry = await harness.post('/api/admin/rounds/current/close').set('Cookie', admin.cookie).send({});
  expect(retry.body.error.code).toBe('no_open_round');
  expect(harness.recorder.events).toEqual([{ event: 'roundClosed', args: [] }]);

  await matching.openRound(actor(admin.id));
  const nextPrompt = await prompts.publish(actor(admin.id), 'Another Round?');
  await prompts.answer(actor(moderator.id), nextPrompt.id, 'Keep learning.');
  const next = await matching.closeRound(actor(admin.id));
  expect(next).toMatchObject({ streaksIncremented: 1, streaksReset: 2, consistentLearnerAwarded: 0 });
  expect((await prisma.student.findUniqueOrThrow({ where: { id: moderator.id } })).streak).toBe(4);
  await matching.openRound(actor(admin.id));
  const empty = await matching.closeRound(actor(admin.id));
  expect(empty).toMatchObject({ streaksIncremented: 0, streaksReset: 1, consistentLearnerAwarded: 0 });
  for (const account of [mentor, mentee, moderator]) {
    expect((await prisma.student.findUniqueOrThrow({ where: { id: account.id } })).streak).toBe(0);
    expect(await prisma.badgeAward.findMany({ where: { studentId: account.id, badge: 'CONSISTENT_LEARNER' } })).toMatchObject([
      { awardedAt: closedAt },
    ]);
  }
  await users.reinstate(actor(admin.id), suspended.id);
  expect((await prisma.student.findUniqueOrThrow({ where: { id: suspended.id } })).streak).toBe(2);
  await matching.openRound(actor(admin.id));
  await prompts.answer(actor(suspended.id), nextPrompt.id, 'A fresh Round after reinstatement.');
  expect(await matching.closeRound(actor(admin.id))).toMatchObject({
    streaksIncremented: 1, streaksReset: 0, consistentLearnerAwarded: 1,
  });
  expect((await prisma.student.findUniqueOrThrow({ where: { id: suspended.id } })).streak).toBe(3);
  expect((await prisma.student.findUniqueOrThrow({ where: { id: removed.id } })).streak).toBe(2);
}, 20_000);

it('an idle-period answer earns XP but cannot qualify for the next Round', async () => {
  const admin = await createTestStaff(harness.app, 'ADMIN');
  const student = await createTestAccount(harness.app);
  const prisma = harness.app.get(PrismaService);
  await prisma.student.update({ where: { id: student.id }, data: { streak: 2 } });
  const prompts = harness.app.get(PromptsService);
  const prompt = await prompts.publish(actor(admin.id), 'Between Rounds?');
  await prompts.answer(actor(student.id), prompt.id, 'An idle-period lesson.');
  expect((await prisma.student.findUniqueOrThrow({ where: { id: student.id } })).streak).toBe(2);
  const matching = harness.app.get(MatchingService);
  await matching.openRound(actor(admin.id));
  expect(await matching.closeRound(actor(admin.id))).toMatchObject({
    streaksIncremented: 0, streaksReset: 1, consistentLearnerAwarded: 0,
  });
  expect((await harness.get('/api/me/progress').set('Cookie', student.cookie)).body.data).toMatchObject({
    xp: 20, streak: 0, badges: [],
  });
});
