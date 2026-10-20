import { describe, expect, it } from 'vitest';
import { generateCohort } from '../../prisma/fixtures/cohort';
import { insertCatalogue } from '../../prisma/seed/catalogue';
import type { Actor } from '../../src/core/actor';
import { UnitOfWork } from '../../src/core/uow';
import { MatchingService } from '../../src/matching/matching.service';
import { SocialService } from '../../src/social/social.service';
import { StudentsService } from '../../src/students/students.service';
import { useHarness } from '../harness/app';
import { createTestAccount, createTestStaff } from '../harness/accounts';

const harness = useHarness();

function actor(studentId: string): Actor {
  return { studentId, sessionHash: null };
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

// §8.2 from ADR-0006's own form, independent of the engine's integer code:
// coverage cover(n) = 1 − 0.5ⁿ weighted 70/30, rounded half up, plus 10 for
// the Mentee's Learning Goal, capped at 100. Every term is a short binary
// fraction, so the floating-point sum is exact and so is the half.
function expectedScore(forward: number, reverse: number, goalBonus: boolean): number {
  const weighted = 70 * (1 - 0.5 ** forward) + 30 * (1 - 0.5 ** reverse);
  return Math.min(100, Math.floor(weighted + 0.5) + (goalBonus ? 10 : 0));
}

function intersect(a: readonly string[], b: readonly string[]): string[] {
  return sorted(a.filter((skill) => b.includes(skill)));
}

// §16.3 row 1, the service and database half that Round open owns (F.4):
// what Round open stores must be what the Students' lists say, a pair that
// already had a Match is never proposed again, and neither is a blocked pair.
// Round open is atomic, so a regression here shows up only as Scores that
// lie or pairs that quietly never form.
describe('Round open through the services', () => {
  it('C4: every stored Score is §8.2 of its coverage and goal flag, and names a FORWARD Skill', async () => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const students = harness.app.get(StudentsService);
    const matching = harness.app.get(MatchingService);
    const admin = await createTestStaff(harness.app, 'ADMIN');
    // The category's cohort (§16.3): size 20, seed 42. Each Student's lists
    // and Learning Goal go through the real Skill and Goal paths.
    const plan = new Map<string, { teach: string[]; learn: string[]; goal: string | null }>();
    for (const generated of generateCohort({ size: 20, seed: 42 })) {
      const account = await createTestAccount(harness.app);
      const ids = (names: string[]): string[] => names.map((name) => skills.get(name) as string);
      await students.setSkills(actor(account.id), ids(generated.canTeach), ids(generated.wantsToLearn));
      const goal = generated.learningGoal ?? null;
      if (goal !== null) {
        await students.setLearningGoal(actor(account.id), skills.get(goal) as string, `I want to learn ${goal}.`);
      }
      plan.set(account.id, { teach: generated.canTeach, learn: generated.wantsToLearn, goal });
    }

    const opened = await matching.openRound(actor(admin.id));
    const round = await matching.getRound(actor(admin.id), opened.round.id);

    expect(opened.matchCount).toBeGreaterThan(0);
    expect(round.matches).toHaveLength(opened.matchCount);
    let goalBonuses = 0;
    for (const listed of round.matches) {
      const match = await matching.getAdminMatch(actor(admin.id), listed.id);
      const mentor = plan.get(match.mentor.id);
      const mentee = plan.get(match.mentee.id);
      if (mentor === undefined || mentee === undefined) throw new Error('A Match names a Student outside the cohort.');
      const forward = match.coverage.forward.map((skill) => skill.name);
      const reverse = match.coverage.reverse.map((skill) => skill.name);
      // The frozen explanation is the two intersections as the lists stood.
      expect(sorted(forward)).toEqual(intersect(mentor.teach, mentee.learn));
      expect(sorted(reverse)).toEqual(intersect(mentee.teach, mentor.learn));
      // Only the Mentee's Goal earns the bonus, and only inside FORWARD.
      expect(match.goalBonusApplied).toBe(mentee.goal !== null && forward.includes(mentee.goal));
      expect(match.compatibilityScore).toBe(expectedScore(forward.length, reverse.length, match.goalBonusApplied));
      expect(match.handMade).toBe(false);
      // The explanation names at least one concrete Skill the Mentee gains.
      expect(forward.length).toBeGreaterThanOrEqual(1);
      if (match.goalBonusApplied) goalBonuses += 1;
    }
    // The cohort exercises the bonus, so the check above covers both branches.
    expect(goalBonuses).toBeGreaterThan(0);
  });

  it('never proposes a pair again once one of them declined their Match', async () => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const docker = skills.get('Docker') as string;
    const students = harness.app.get(StudentsService);
    const matching = harness.app.get(MatchingService);
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const mentor = await createTestAccount(harness.app);
    const mentee = await createTestAccount(harness.app);
    await students.setSkills(actor(mentor.id), [docker], []);
    await students.setSkills(actor(mentee.id), [], [docker]);

    // Round 1 pairs them, the only viable pair, and the Mentee declines.
    expect((await matching.openRound(actor(admin.id))).matchCount).toBe(1);
    const current = await matching.currentMatch(actor(mentee.id));
    if (current.match === null) throw new Error('Round 1 made no Match for the Mentee.');
    expect(current.match.partner.id).toBe(mentor.id);
    await matching.decline(actor(mentee.id), current.match.id);
    await matching.closeRound(actor(admin.id));

    // Round 2: the same lists, but the pair has a Match row, so no Match.
    const opened = await matching.openRound(actor(admin.id));
    expect(opened.matchCount).toBe(0);
    expect(sorted(opened.unmatched.map((student) => student.id))).toEqual(sorted([mentor.id, mentee.id]));
  });

  for (const blocker of ['mentor', 'mentee'] as const) {
    it(`never proposes a blocked pair, here blocked by the would-be ${blocker}`, async () => {
      const skills = await insertCatalogue(harness.app.get(UnitOfWork));
      const docker = skills.get('Docker') as string;
      const students = harness.app.get(StudentsService);
      const matching = harness.app.get(MatchingService);
      const admin = await createTestStaff(harness.app, 'ADMIN');
      const mentor = await createTestAccount(harness.app);
      const blocked = await createTestAccount(harness.app);
      const other = await createTestAccount(harness.app);
      // The Mentor can teach both learners; the Block leaves one viable pair.
      // `blocked` is made before `other`, so its UUIDv7 id is the lower one:
      // with the Block ignored, most-constrained-first picks it on the tie
      // (§8.3 step 7) and pairs it with the Mentor. That is what lets this test
      // catch a matcher that ignores Blocks; keep the order.
      await students.setSkills(actor(mentor.id), [docker], []);
      await students.setSkills(actor(blocked.id), [], [docker]);
      await students.setSkills(actor(other.id), [], [docker]);
      const [by, target] = blocker === 'mentor' ? [mentor.id, blocked.id] : [blocked.id, mentor.id];
      await harness.app.get(SocialService).block(actor(by), target);

      const opened = await matching.openRound(actor(admin.id));

      const round = await matching.getRound(actor(admin.id), opened.round.id);
      expect(round.matches.map((match) => [match.mentor.id, match.mentee.id])).toEqual([[mentor.id, other.id]]);
      expect(opened.unmatched.map((student) => student.id)).toEqual([blocked.id]);
    });
  }
});
