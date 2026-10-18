import { describe, expect, it } from 'vitest';
import { StudentsService } from '../../src/students/students.service';
import { useHarness } from '../harness/app';
import { createTestAccount, type TestAccount } from '../harness/accounts';

const harness = useHarness();

// §16.3 row 11: a path that writes a name, then a search by the name's plain
// form. The outcome is bound, not the fold's technique. The Admin edit's case
// is added by the Users table ticket.
async function searchIds(viewer: TestAccount, q: string): Promise<string[]> {
  const page = await harness.app
    .get(StudentsService)
    .search({ studentId: viewer.id, sessionHash: null }, { q, sort: 'name', order: 'asc', page: 1, pageSize: 50 });
  return page.items.map((item) => item.student.id);
}

describe('a name written at sign-up is found by its plain form', () => {
  it('finds Hélène, أحمد and فاطمة by helene, احمد and فاطمه', async () => {
    const helene = await createTestAccount(harness.app, { displayName: 'Hélène Dubois' });
    const ahmad = await createTestAccount(harness.app, { displayName: 'أحمد منصور' });
    const fatima = await createTestAccount(harness.app, { displayName: 'فاطمة' });

    expect(await searchIds(helene, 'helene')).toEqual([helene.id]);
    expect(await searchIds(helene, 'احمد')).toEqual([ahmad.id]);
    expect(await searchIds(helene, 'فاطمه')).toEqual([fatima.id]);
  });
});

describe("a name written by the Student's own edit is found by its plain form", () => {
  it('finds the new name, and after a rename the old folded form no longer finds it', async () => {
    const student = await createTestAccount(harness.app, { displayName: 'Sam' });
    const actor = { studentId: student.id, sessionHash: null };
    const students = harness.app.get(StudentsService);

    await students.updateOwnProfile(actor, { displayName: 'Hélène' });
    expect(await searchIds(student, 'helene')).toEqual([student.id]);

    // `zoe` does not contain `helene`, so the old form must stop matching.
    await students.updateOwnProfile(actor, { displayName: 'Zoé' });
    expect(await searchIds(student, 'helene')).toEqual([]);
    expect(await searchIds(student, 'zoe')).toEqual([student.id]);
  });
});
