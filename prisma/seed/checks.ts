import type { EnvRecord } from '../../src/core/env';
import type { PrismaService } from '../../src/core/prisma.service';
import { foldName } from '../../src/shared/fold-name';
import { normalizeEmail } from '../../src/shared/limits';
import { bootstrapStaff } from './bootstrap';
import { SeedFailure } from './failure';

// Every email the seed makes at this fixture version: the two bootstrap
// accounts. The thirty sign-ups of §14.3 join with their slice.
function seedEmails(env: EnvRecord): string[] {
  return bootstrapStaff(env).map((staff) => normalizeEmail(staff.email));
}

// §14.9's guard, before a run that writes deletes anything: every Student
// must be one the seed makes, by email. Otherwise the record was lost over
// real data, and only a reset, which someone runs on purpose, deletes it.
export async function assertOnlySeedAccounts(
  prisma: PrismaService,
  env: EnvRecord,
  reset: string,
): Promise<void> {
  const foreign = await prisma.student.count({ where: { email: { notIn: seedEmails(env) } } });
  if (foreign > 0) {
    throw new SeedFailure(
      `the database holds ${foreign} account(s) the seed did not make, so nothing was deleted; run ${reset} to empty it`,
    );
  }
}

// §14.8, the end-state assertions this fixture version implements.
export async function assertEndState(prisma: PrismaService): Promise<void> {
  // Check 10: every Student's search column is the fold of its name. It
  // covers the two bootstrap accounts, which the suite never reaches.
  const students = await prisma.student.findMany({
    select: { displayName: true, displayNameSearch: true },
  });
  const wrong = students.filter(
    (student) => student.displayNameSearch !== foldName(student.displayName),
  ).length;
  if (wrong > 0) {
    throw new SeedFailure(
      `check 10: ${wrong} of ${students.length} Students have a display_name_search other than foldName(display_name)`,
    );
  }
}
