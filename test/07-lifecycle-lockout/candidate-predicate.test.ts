import { describe, expect, it } from 'vitest';
import { insertCatalogue } from '../../prisma/seed/catalogue';
import { AdminUsersService } from '../../src/admin/admin-users.service';
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

// §8.1, §16.3 row 7: a candidate lists at least one Skill, is not an Admin,
// and is neither Suspended nor Removed.
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

  // §8.1, §12.7: a Suspension or a Removal, through the Users table, takes a
  // Student out of the pool, and a reinstatement puts them back.
  it('leaves out a Suspended and a Removed Student, and takes a reinstated one back', async () => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const docker = skills.get('Docker') as string;
    const students = harness.app.get(StudentsService);
    const matching = harness.app.get(MatchingService);
    const users = harness.app.get(AdminUsersService);
    const admin = await createTestStaff(harness.app, 'ADMIN');
    const suspended = await createTestAccount(harness.app);
    const removed = await createTestAccount(harness.app);
    const learner = await createTestAccount(harness.app);
    // Both sanctioned Students teach what the learner wants (§8.2: Score 35).
    await students.setSkills(actor(suspended.id), [docker], []);
    await students.setSkills(actor(removed.id), [docker], []);
    await students.setSkills(actor(learner.id), [], [docker]);
    await users.suspend(actor(admin.id), suspended.id);
    await users.remove(actor(admin.id), removed.id);

    const opened = await matching.openRound(actor(admin.id));
    expect(opened.matchCount).toBe(0);
    expect(opened.unmatched.map((student) => student.id)).toEqual([learner.id]);

    // Reinstated while the Round is open: back in the pool, so unmatched now
    // and a hand-made Match may pair them; the Removed Student never.
    await users.reinstate(actor(admin.id), suspended.id);
    const round = await matching.getRound(actor(admin.id), opened.round.id);
    expect(round.unmatched?.map((student) => student.id).sort()).toEqual([learner.id, suspended.id].sort());
    expect(await matching.createHandMadeMatch(actor(admin.id), [removed.id, learner.id]).catch((err: { code: string }) => err.code)).toBe(
      'not_a_candidate',
    );
    expect((await matching.createHandMadeMatch(actor(admin.id), [suspended.id, learner.id])).status).toBe('MATCHED');
  });
});
