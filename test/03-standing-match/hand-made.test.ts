import { expect, it } from 'vitest';
import { insertCatalogue } from '../../prisma/seed/catalogue';
import { UnitOfWork } from '../../src/core/uow';
import { MatchingService } from '../../src/matching/matching.service';
import { StudentsService } from '../../src/students/students.service';
import { useHarness } from '../harness/app';
import { createTestAccount, createTestStaff } from '../harness/accounts';

const harness = useHarness();
const actor = (studentId: string) => ({ studentId, sessionHash: null });

it('admits only one of two creations sharing a Student, with no losing Match or notification', async () => {
  const skills = await insertCatalogue(harness.app.get(UnitOfWork));
  const docker = skills.get('Docker')!;
  const students = harness.app.get(StudentsService);
  const matching = harness.app.get(MatchingService);
  const admin = actor((await createTestStaff(harness.app, 'ADMIN')).id);
  const round = await matching.openRound(admin);
  const shared = actor((await createTestAccount(harness.app)).id);
  const first = actor((await createTestAccount(harness.app)).id);
  const second = actor((await createTestAccount(harness.app)).id);
  await students.setSkills(shared, [docker], []);
  await students.setSkills(first, [], [docker]);
  await students.setSkills(second, [], [docker]);
  harness.recorder.clear();

  harness.barriers.arm('match.handmade');
  const one = matching.createHandMadeMatch(admin, [shared.studentId, first.studentId]);
  const two = matching.createHandMadeMatch(admin, [second.studentId, shared.studentId]);
  const settled = Promise.allSettled([one, two]);
  await harness.barriers.waitFor('match.handmade', 2);
  // Neither uncommitted attempt may have announced a Match.
  expect(harness.recorder.events).toEqual([]);
  harness.barriers.disarm('match.handmade');
  harness.barriers.releaseAll('match.handmade');
  const results = await settled;

  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  const winner = results.find((result) => result.status === 'fulfilled');
  const loser = results.find((result) => result.status === 'rejected');
  if (winner?.status !== 'fulfilled' || loser?.status !== 'rejected') throw new Error('Expected one winner.');
  expect(loser.reason).toMatchObject({ code: 'already_matched' });
  const detail = await matching.getRound(admin, round.round.id);
  expect(detail.matches.map((match) => match.id)).toEqual([winner.value.id]);
  expect(detail.unmatched?.map((student) => student.id)).toEqual([
    winner.value.mentee.id === first.studentId ? second.studentId : first.studentId,
  ]);
  expect(harness.recorder.events).toEqual([
    { event: 'matchReady', args: [[winner.value.mentor.id, winner.value.mentee.id]] },
  ]);
});
