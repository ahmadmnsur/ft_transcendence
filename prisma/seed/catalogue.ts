import type { UnitOfWork } from '../../src/core/uow';
import { RARE_SKILLS, SKILLS } from '../fixtures/cohort';

// The fixture's Skill lists are the catalogue: 27 Skills (§14.1).
const CATALOGUE: readonly string[] = [...SKILLS, ...RARE_SKILLS];

// §14.4 step 1: inserted directly, in one transaction. Skill rows are never
// updated or deleted afterwards (§4.3.4).
export async function insertCatalogue(uow: UnitOfWork): Promise<number> {
  return uow.run('catalogue', async (tx) => {
    const created = await tx.skill.createMany({ data: CATALOGUE.map((name) => ({ name })) });
    return created.count;
  });
}
