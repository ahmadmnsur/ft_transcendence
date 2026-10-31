import { describe, expect, it } from 'vitest';
import { insertCatalogue } from '../../prisma/seed/catalogue';
import { UnitOfWork } from '../../src/core/uow';
import { MatchingService } from '../../src/matching/matching.service';
import { StudentsService } from '../../src/students/students.service';
import { useHarness } from '../harness/app';
import { createTestAccount, createTestStaff } from '../harness/accounts';

const harness = useHarness();
const actor = (studentId: string) => ({ studentId, sessionHash: null });

async function outcome(work: Promise<unknown>): Promise<string> {
  try {
    await work;
    return 'ok';
  } catch (error) {
    if (typeof (error as { code?: unknown }).code === 'string') return (error as { code: string }).code;
    throw error;
  }
}

describe('hand-made creation versus Round close', () => {
  it('refuses creation when its Round closes and another opens before the retry', async () => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const matching = harness.app.get(MatchingService);
    const students = harness.app.get(StudentsService);
    const admin = actor((await createTestStaff(harness.app, 'ADMIN')).id);
    const a = actor((await createTestAccount(harness.app)).id);
    const b = actor((await createTestAccount(harness.app)).id);
    await students.setSkills(a, [skills.get('Docker')!], []);
    await students.setSkills(b, [skills.get('Docker')!], []);
    const first = await matching.openRound(admin);
    expect(first.matchCount).toBe(0);

    harness.barriers.arm('match.handmade');
    const creation = outcome(matching.createHandMadeMatch(admin, [a.studentId, b.studentId]));
    await harness.barriers.waitFor('match.handmade', 1);
    await matching.closeRound(admin);
    const second = await matching.openRound(admin);
    expect(second.matchCount).toBe(0);
    harness.recorder.clear();
    harness.barriers.disarm('match.handmade');
    harness.barriers.release('match.handmade');

    expect(await creation).toBe('no_open_round');
    const closed = await matching.getRound(admin, first.round.id);
    const opened = await matching.getRound(admin, second.round.id);
    expect(closed.round.closedAt).not.toBeNull();
    expect(opened.round.closedAt).toBeNull();
    expect(closed.matches).toEqual([]);
    expect(opened.matches).toEqual([]);
    expect(harness.recorder.events).toEqual([]);
  });

  it.each(['creation', 'close'] as const)('%s commits first: no in-progress Match survives in the closed Round', async (first) => {
    const skills = await insertCatalogue(harness.app.get(UnitOfWork));
    const matching = harness.app.get(MatchingService);
    const students = harness.app.get(StudentsService);
    const admin = actor((await createTestStaff(harness.app, 'ADMIN')).id);
    const opened = await matching.openRound(admin);
    const a = actor((await createTestAccount(harness.app)).id);
    const b = actor((await createTestAccount(harness.app)).id);
    await students.setSkills(a, [skills.get('Docker')!], []);
    await students.setSkills(b, [], [skills.get('Docker')!]);
    harness.recorder.clear();

    harness.barriers.arm('match.handmade');
    harness.barriers.arm('round.close');
    const creation = outcome(matching.createHandMadeMatch(admin, [a.studentId, b.studentId]));
    const close = outcome(matching.closeRound(admin));
    await harness.barriers.waitFor('match.handmade', 1);
    await harness.barriers.waitFor('round.close', 1);
    harness.barriers.disarm('match.handmade');
    harness.barriers.disarm('round.close');
    harness.barriers.release(first === 'creation' ? 'match.handmade' : 'round.close');
    expect(await (first === 'creation' ? creation : close)).toBe('ok');
    harness.barriers.release(first === 'creation' ? 'round.close' : 'match.handmade');
    expect(await close).toBe('ok');
    expect(await creation).toBe(first === 'creation' ? 'ok' : 'no_open_round');

    const detail = await matching.getRound(admin, opened.round.id);
    expect(detail.round.closedAt).not.toBeNull();
    expect(detail.unmatched).toBeNull();
    expect(detail.matches.map((match) => match.status)).toEqual(first === 'creation' ? ['LAPSED'] : []);
    expect(harness.recorder.events.map((event) => event.event)).toEqual(
      first === 'creation' ? ['matchReady', 'roundClosed'] : ['roundClosed'],
    );
  });
});
