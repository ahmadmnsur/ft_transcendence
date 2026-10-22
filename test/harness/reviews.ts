import type { INestApplication } from '@nestjs/common';
import { insertCatalogue } from '../../prisma/seed/catalogue';
import { UnitOfWork } from '../../src/core/uow';
import { MatchingService } from '../../src/matching/matching.service';
import { ReviewsService } from '../../src/reviews/reviews.service';
import { StudentsService } from '../../src/students/students.service';
import { createTestAccount, createTestStaff, type TestAccount } from './accounts';

export type ReviewedMatch = {
  matchId: string;
  reviewId: string;
  mentor: TestAccount;
  mentee: TestAccount;
  // The Admin who opened the Round, outside the pair.
  admin: TestAccount;
};

const actor = (studentId: string) => ({ studentId, sessionHash: null });

// A COMPLETED Match, made through the services: an Admin opens a Round that
// pairs a Mentor teaching Docker with a Mentee learning it, both accept, and
// the Mentee submits the Review (§9.2). The Round stays open.
export async function reviewedMatch(app: INestApplication): Promise<ReviewedMatch> {
  const matching = app.get(MatchingService);
  const students = app.get(StudentsService);
  const docker = (await insertCatalogue(app.get(UnitOfWork))).get('Docker');
  if (docker === undefined) throw new Error('reviewedMatch: the catalogue has no Docker.');
  const admin = await createTestStaff(app, 'ADMIN');
  const mentor = await createTestAccount(app);
  const mentee = await createTestAccount(app);
  await students.setSkills(actor(mentor.id), [docker], []);
  await students.setSkills(actor(mentee.id), [], [docker]);
  await matching.openRound(actor(admin.id));
  const match = (await matching.currentMatch(actor(mentee.id))).match;
  if (match === null) throw new Error('reviewedMatch: the Round paired nobody.');
  await matching.accept(actor(mentor.id), match.id);
  await matching.accept(actor(mentee.id), match.id);
  const { reviewId } = await app.get(ReviewsService).submitReview(actor(mentee.id), match.id, {
    learningOutcome: { learned: 'How a layer cache works.', canNowDo: 'Order a Dockerfile.' },
    privateFeedback: { answerUsefulness: 'Very useful.', answerExplanation: 'Clear examples.' },
    publicTakeaway: 'Copy the lockfile before the sources.',
  });
  return { matchId: match.id, reviewId, mentor, mentee, admin };
}
