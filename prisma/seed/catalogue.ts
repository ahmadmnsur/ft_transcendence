import type { UnitOfWork } from '../../src/core/uow';
import { RARE_SKILLS, SKILLS } from '../fixtures/cohort';

const CATALOGUE: readonly string[] = [...SKILLS, ...RARE_SKILLS];

export async function insertCatalogue(uow: UnitOfWork): Promise<Map<string, string>> {
  return uow.run('catalogue', async (tx) => {
    const created = await tx.skill.createManyAndReturn({
      data: CATALOGUE.map((name) => ({ name })),
      select: { id: true, name: true },
    });
    return new Map(created.map((skill) => [skill.name, skill.id]));
  });
}
