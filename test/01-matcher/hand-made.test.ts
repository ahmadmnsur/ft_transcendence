import { describe, expect, it } from 'vitest';
import { insertCatalogue } from '../../prisma/seed/catalogue';
import { UnitOfWork } from '../../src/core/uow';
import { MatchingService } from '../../src/matching/matching.service';
import { SocialService } from '../../src/social/social.service';
import { StudentsService } from '../../src/students/students.service';
import { useHarness } from '../harness/app';
import { createTestAccount, createTestStaff } from '../harness/accounts';

const harness = useHarness();
const actor = (studentId: string) => ({ studentId, sessionHash: null });

describe('hand-made Matches through the services', () => {
  it('re-pairs a declined pair and counts declined rows when rotating all six Missions', async () => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const matching = harness.app.get(MatchingService);
    const students = harness.app.get(StudentsService);
    const admin = actor((await createTestStaff(harness.app, 'ADMIN')).id);
    const teacher = actor((await createTestAccount(harness.app)).id);
    const learner = actor((await createTestAccount(harness.app)).id);
    await students.setSkills(teacher, [skills.get('Docker')!], []);
    await students.setSkills(learner, [], [skills.get('Docker')!]);
    const opened = await matching.openRound(admin);
    expect(opened.matchCount).toBe(1);
    const initial = (await matching.getRound(admin, opened.round.id)).matches[0];
    await matching.decline(learner, initial.id);

    for (const mission of [
      'PROJECT_PROBLEM', 'PAIR_PROGRAMMING', 'CODE_REVIEW',
      'TECHNOLOGY_DISCUSSION', 'ADVICE', 'TECHNICAL_CONCEPT',
    ]) {
      const view = await matching.createHandMadeMatch(admin, [learner.studentId, teacher.studentId]);
      expect(view).toMatchObject({
        mentor: { id: teacher.studentId }, mentee: { id: learner.studentId },
        compatibilityScore: null, handMade: true, mission,
      });
      await matching.decline(learner, view.id);
    }
    expect((await matching.getRound(admin, opened.round.id)).matches).toHaveLength(7);
  });

  it.each(['teacher', 'learner'] as const)('refuses a Block placed by the %s without creating a Match or event', async (blocker) => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const matching = harness.app.get(MatchingService);
    const students = harness.app.get(StudentsService);
    const admin = actor((await createTestStaff(harness.app, 'ADMIN')).id);
    const teacher = actor((await createTestAccount(harness.app)).id);
    const learner = actor((await createTestAccount(harness.app)).id);
    await students.setSkills(teacher, [skills.get('Docker')!], []);
    await students.setSkills(learner, [], [skills.get('Docker')!]);
    const [by, target] = blocker === 'teacher' ? [teacher, learner] : [learner, teacher];
    await harness.app.get(SocialService).block(by, target.studentId);
    const opened = await matching.openRound(admin);
    expect(opened.matchCount).toBe(0);
    harness.recorder.clear();

    await expect(matching.createHandMadeMatch(admin, [teacher.studentId, learner.studentId]))
      .rejects.toMatchObject({ code: 'pair_blocked' });
    expect((await matching.getRound(admin, opened.round.id)).matches).toEqual([]);
    expect(harness.recorder.events).toEqual([]);
  });

  it('uses the goal bonus to choose the higher-id Mentor and freezes the chosen explanation', async () => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const docker = skills.get('Docker')!;
    const git = skills.get('Git')!;
    const matching = harness.app.get(MatchingService);
    const students = harness.app.get(StudentsService);
    const admin = actor((await createTestStaff(harness.app, 'ADMIN')).id);
    await matching.openRound(admin);
    const lower = actor((await createTestAccount(harness.app)).id);
    const higher = actor((await createTestAccount(harness.app)).id);
    expect(lower.studentId < higher.studentId).toBe(true);
    await students.setSkills(lower, [git], [docker]);
    await students.setSkills(higher, [docker], [git]);
    await students.setLearningGoal(lower, docker, 'Learn Docker together.');

    const view = await matching.createHandMadeMatch(admin, [lower.studentId, higher.studentId]);
    expect(view).toMatchObject({
      mentor: { id: higher.studentId }, mentee: { id: lower.studentId },
      status: 'MATCHED', compatibilityScore: null, handMade: true,
      goalBonusApplied: true, mentorAccepted: false, menteeAccepted: false,
      mission: 'TECHNICAL_CONCEPT',
      coverage: { forward: [{ id: docker, name: 'Docker' }], reverse: [{ id: git, name: 'Git' }] },
    });
    await students.setSkills(lower, [], []);
    await students.setSkills(higher, [], []);
    expect(await matching.getAdminMatch(admin, view.id)).toEqual({ ...view, review: null, privateFeedback: null });
    expect(await matching.getMatch(lower, view.id)).toMatchObject({
      myRole: 'MENTEE', compatibilityScore: null, handMade: true,
      coverage: view.coverage, goalBonusApplied: true,
    });
  });

  it('keeps the bonus off when the Mentee\u2019s Goal lists a Skill the Mentor does not teach', async () => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const matching = harness.app.get(MatchingService);
    const students = harness.app.get(StudentsService);
    const admin = actor((await createTestStaff(harness.app, 'ADMIN')).id);
    await matching.openRound(admin);
    const teacher = actor((await createTestAccount(harness.app)).id);
    const learner = actor((await createTestAccount(harness.app)).id);
    await students.setSkills(teacher, [skills.get('Docker')!], []);
    await students.setSkills(learner, [], [skills.get('Docker')!, skills.get('Git')!]);
    await students.setLearningGoal(learner, skills.get('Git')!, 'I want to learn Git.');

    const view = await matching.createHandMadeMatch(admin, [learner.studentId, teacher.studentId]);
    expect(view.mentor.id).toBe(teacher.studentId);
    expect(view.coverage.forward.map((skill) => skill.name)).toEqual(['Docker']);
    expect(view.goalBonusApplied).toBe(false);
  });

  it('allows empty coverage below the matcher floor and uses the lower id for the zero-score tie', async () => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const matching = harness.app.get(MatchingService);
    const students = harness.app.get(StudentsService);
    const admin = actor((await createTestStaff(harness.app, 'ADMIN')).id);
    await matching.openRound(admin);
    const lower = actor((await createTestAccount(harness.app)).id);
    const higher = actor((await createTestAccount(harness.app)).id);
    await students.setSkills(lower, [skills.get('Docker')!], []);
    await students.setSkills(higher, [], [skills.get('Git')!]);

    const view = await matching.createHandMadeMatch(admin, [higher.studentId, lower.studentId]);
    expect(view).toMatchObject({
      mentor: { id: lower.studentId }, mentee: { id: higher.studentId },
      compatibilityScore: null, handMade: true, goalBonusApplied: false,
      coverage: { forward: [], reverse: [] },
    });
  });
});
