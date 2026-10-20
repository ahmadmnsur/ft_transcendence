import { describe, expect, it } from 'vitest';
import { insertCatalogue } from '../../prisma/seed/catalogue';
import type { Actor } from '../../src/core/actor';
import { UnitOfWork } from '../../src/core/uow';
import { MatchingService } from '../../src/matching/matching.service';
import { StudentsService } from '../../src/students/students.service';
import { useHarness } from '../harness/app';
import { createTestAccount, createTestStaff } from '../harness/accounts';

const harness = useHarness();

function actor(studentId: string): Actor {
  return { studentId, sessionHash: null };
}

// §8.1, §16.3 row 7: a candidate lists at least one Skill and is not an Admin.
// Nothing else says so when the predicate slips: an Admin who teaches what a
// Student wants would simply be matched, and a Skill-less Student would sit on
// the unmatched list as if the matcher had failed them.
describe('the candidate predicate', () => {
  it('leaves out an Admin, whatever Skills they list, and a Student with no Skill', async () => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const docker = skills.get('Docker') as string;
    const students = harness.app.get(StudentsService);
    const matching = harness.app.get(MatchingService);
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const learner = await createTestAccount(harness.app);
    await createTestAccount(harness.app);
    // The Admin teaches what the learner wants: a Match of Score 35 if Admins
    // were candidates (§8.2).
    await students.setSkills(actor(admin.id), [docker], []);
    await students.setSkills(actor(learner.id), [], [docker]);

    const opened = await matching.openRound(actor(admin.id));

    expect(opened.matchCount).toBe(0);
    expect(opened.unmatched.map((student) => student.id)).toEqual([learner.id]);
    // §8.9: the open Round's unmatched list, derived when read, agrees.
    const round = await matching.getRound(actor(admin.id), opened.round.id);
    expect(round.matches).toEqual([]);
    expect(round.unmatched?.map((student) => student.id)).toEqual([learner.id]);
  });

  it('keeps a Peer Moderator, who is matched like any Student', async () => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const docker = skills.get('Docker') as string;
    const students = harness.app.get(StudentsService);
    const matching = harness.app.get(MatchingService);
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const moderator = await createTestStaff(harness.app, 'PEER_MODERATOR');
    const learner = await createTestAccount(harness.app);
    await students.setSkills(actor(moderator.id), [docker], []);
    await students.setSkills(actor(learner.id), [], [docker]);

    const opened = await matching.openRound(actor(admin.id));

    expect(opened.matchCount).toBe(1);
    expect(opened.unmatched).toEqual([]);
    const round = await matching.getRound(actor(admin.id), opened.round.id);
    expect(round.matches.map((match) => [match.mentor.id, match.mentee.id])).toEqual([[moderator.id, learner.id]]);
  });
});
