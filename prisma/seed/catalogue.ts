import type { UnitOfWork } from '../../src/core/uow';
import { RARE_SKILLS, SKILLS } from '../fixtures/cohort';

// The fixture's Skill lists are the catalogue: 27 Skills (§14.1).
const CATALOGUE: readonly string[] = [...SKILLS, ...RARE_SKILLS];

// §14.4 step 1: inserted directly, in one transaction. Skill rows are never
// updated or deleted afterwards (§4.3.4). Returns each Skill's id by name,
// since the Skill-list paths take ids (§6.2).
export async function insertCatalogue(uow: UnitOfWork): Promise<Map<string, string>> {
  return uow.run('catalogue', async (tx) => {
    const created = await tx.skill.createManyAndReturn({
      data: CATALOGUE.map((name) => ({ name })),
      select: { id: true, name: true },
    });
    return new Map(created.map((skill) => [skill.name, skill.id]));
  });
}
