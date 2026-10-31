import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { generateCohort } from '../../prisma/fixtures/cohort';
import { insertCatalogue } from '../../prisma/seed/catalogue';
import { PrismaService } from '../../src/core/prisma.service';
import { UnitOfWork } from '../../src/core/uow';
import { MatchingService } from '../../src/matching/matching.service';
import { ReviewsService } from '../../src/reviews/reviews.service';
import { StudentsService } from '../../src/students/students.service';
import { createTestAccount, createTestStaff } from '../harness/accounts';
import { useHarness } from '../harness/app';
import { recreateTestDatabase } from '../harness/database';

const harness = useHarness();
const actor = (studentId: string) => ({ studentId, sessionHash: null });

async function sixRounds(): Promise<unknown[]> {
  const matching = harness.app.get(MatchingService);
  const students = harness.app.get(StudentsService);
  const reviews = harness.app.get(ReviewsService);
  const skills = await insertCatalogue(harness.app.get(UnitOfWork));
  const admin = actor((await createTestStaff(harness.app, 'ADMIN')).id);
  const positions = new Map<string, number>();
  for (const [position, generated] of generateCohort({ size: 20, seed: 42 }).entries()) {
    const student = actor((await createTestAccount(harness.app)).id);
    positions.set(student.studentId, position);
    await students.setSkills(
      student,
      generated.canTeach.map((name) => skills.get(name)!),
      generated.wantsToLearn.map((name) => skills.get(name)!),
    );
    if (generated.learningGoal != null)
      await students.setLearningGoal(
        student,
        skills.get(generated.learningGoal)!,
        `Learn ${generated.learningGoal}.`,
      );
  }
  const sequence: unknown[] = [];
  for (let number = 1; number <= 6; number++) {
    const opened = await matching.openRound(admin);
    const round = await matching.getRound(admin, opened.round.id);
    expect(round.matches.length).toBeGreaterThan(0);
    const entries: unknown[] = [];
    for (const listed of round.matches) {
      const match = await matching.getAdminMatch(admin, listed.id);
      const forward = match.coverage.forward.map((skill) => skill.name);
      const reverse = match.coverage.reverse.map((skill) => skill.name);
      expect(forward.length).toBeGreaterThanOrEqual(1);
      const score = Math.min(
        100,
        Math.floor(70 * (1 - 0.5 ** forward.length) + 30 * (1 - 0.5 ** reverse.length) + 0.5) +
          (match.goalBonusApplied ? 10 : 0),
      );
      expect(match.compatibilityScore).toBe(score);
      expect(match.compatibilityScore).toBeGreaterThanOrEqual(25);
      entries.push([
        positions.get(match.mentor.id),
        positions.get(match.mentee.id),
        match.compatibilityScore,
        match.mission,
        forward,
        reverse,
        match.goalBonusApplied,
      ]);
      await matching.accept(actor(match.mentor.id), match.id);
      await matching.accept(actor(match.mentee.id), match.id);
      await reviews.submitReview(actor(match.mentee.id), match.id, {
        learningOutcome: {
          learned: `A concrete idea about ${forward[0]}.`,
          canNowDo: `Explain ${forward[0]}.`,
        },
        privateFeedback: { answerUsefulness: 'Useful.', answerExplanation: 'Clear examples.' },
        publicTakeaway: `I can now explain ${forward[0]}.`,
      });
    }
    sequence.push(entries);
    await matching.closeRound(admin);
    expect(
      (await matching.getRound(admin, opened.round.id)).matches.every(
        (match) => match.status === 'COMPLETED',
      ),
    ).toBe(true);
  }
  return sequence;
}

it('C3, C4, C6 and C7: six accepted and reviewed Rounds replay identically from empty databases', async () => {
  const first = await sixRounds();
  await harness.app.get(PrismaService).$disconnect();
  const baseUrl = new URL(process.env.DATABASE_URL!);
  if (!baseUrl.pathname.endsWith('_test')) throw new Error('Replay requires the harness test database.');
  baseUrl.pathname = baseUrl.pathname.slice(0, -5);
  const testUrl = await recreateTestDatabase({ ...process.env, DATABASE_URL: baseUrl.toString() });
  const migrated = spawnSync('npx', ['prisma', 'migrate', 'deploy', '--config', 'prisma.config.ts'], {
    env: { ...process.env, DATABASE_URL: testUrl },
    encoding: 'utf8',
  });
  if (migrated.status !== 0) throw new Error(`Replay migration failed: ${migrated.stderr}`);
  const second = await sixRounds();
  expect(second).toEqual(first);
}, 60_000);
