import { createTestAccount } from '../harness/accounts';
import { expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { useHarness } from '../harness/app';

const harness = useHarness();

it('keeps private_feedback_rating_range as a nullable 1–5 CHECK after migration', async () => {
  const rows = await harness.app.get(PrismaService).$queryRaw<Array<{ definition: string }>>`
    SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE conrelid = '"PrivateFeedback"'::regclass AND conname = 'private_feedback_rating_range' AND contype = 'c'`;
  expect(rows).toEqual([{ definition: 'CHECK (((rating >= 1) AND (rating <= 5)))' }]);
});

it('backs the nullable rating range with SQL even when the service is bypassed', async () => {
  const prisma = harness.app.get(PrismaService);
  const mentor = await createTestAccount(harness.app);
  const mentee = await createTestAccount(harness.app);
  const round = await prisma.round.create({ data: {} });
  const match = await prisma.match.create({
    data: {
      roundId: round.id,
      mentorId: mentor.id,
      menteeId: mentee.id,
      status: 'COMPLETED',
      mission: 'ADVICE',
      goalBonusApplied: false,
    },
  });
  const review = await prisma.review.create({
    data: { matchId: match.id, learned: 'Index scans.', canNowDo: 'Read a plan.' },
  });
  const feedback = await prisma.privateFeedback.create({
    data: { reviewId: review.id, answerUsefulness: 'Useful.', answerExplanation: 'Clear.' },
  });
  for (const rating of [0, 6]) {
    await expect(
      prisma.$executeRaw`UPDATE "PrivateFeedback" SET rating = ${rating} WHERE id = ${feedback.id}::uuid`,
    ).rejects.toThrow('private_feedback_rating_range');
  }
  for (const rating of [null, 1, 5]) {
    await expect(
      prisma.$executeRaw`UPDATE "PrivateFeedback" SET rating = ${rating}::smallint WHERE id = ${feedback.id}::uuid`,
    ).resolves.toBe(1);
  }
});
