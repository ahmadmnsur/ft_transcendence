import { v7 as uuidv7 } from 'uuid';
import type { Prisma } from '../../src/generated/prisma/client';
import { EMAIL_TAKEN } from '../../src/auth/account-create';
import type { EnvRecord } from '../../src/core/env';
import { Refusal } from '../../src/core/errors';
import type { SupabaseAuthClient } from '../../src/core/supabase-auth';
import type { UnitOfWork } from '../../src/core/uow';
import { nameFields } from '../../src/shared/fold-name';
import {
  isValidDisplayName,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from '../../src/shared/limits';
import type { Role } from '../../src/shared/roles';
import { SeedFailure } from './failure';

export type StaffRole = Exclude<Role, 'STUDENT'>;

export type StaffAccountInput = {
  email: string;
  password: string;
  displayName: string;
  role: StaffRole;
};

// The bootstrap Admin and Peer Moderator (§14.1), from the validated
// environment: the boot check's step 1 already holds each password to the
// password rule.
export function bootstrapStaff(env: EnvRecord): StaffAccountInput[] {
  return [
    {
      email: env['ADMIN_EMAIL'] as string,
      password: env['ADMIN_PASSWORD'] as string,
      displayName: 'PeerConnect Admin',
      role: 'ADMIN',
    },
    {
      email: env['MODERATOR_EMAIL'] as string,
      password: env['MODERATOR_PASSWORD'] as string,
      displayName: 'Yara',
      role: 'PEER_MODERATOR',
    },
  ];
}

// §14.1: a staff account, made the way sign-up makes every account (ADR-0008
// d12's note of 2026-10-02): NestJS makes the id, Supabase's admin create sets
// the password, then the `Student` row is written with its role and both name
// fields through `nameFields`. The seed's bootstrap and the test harness's
// staff helper share it (§16.2). Nothing is hashed here.
export async function createStaffAccount(
  input: StaffAccountInput,
  deps: { supabase: SupabaseAuthClient; uow: UnitOfWork },
): Promise<{ id: string; email: string }> {
  // Sign-up's validation (§6.0.3), so no staff account is made that no
  // sign-in can match. The password is then used trimmed, as sign-up and
  // sign-in use it (§5.1).
  for (const [field, valid] of [
    ['email', isValidEmail(input.email)],
    ['password', isValidPassword(input.password)],
    ['display name', isValidDisplayName(input.displayName)],
  ] as const) {
    if (!valid) throw new SeedFailure(`the ${input.role} account's ${field} breaks sign-up's rule`);
  }
  const id = uuidv7();
  await deps.supabase.adminCreateUser(id, input.password.trim());
  const email = normalizeEmail(input.email);
  try {
    // The id is passed in Prisma's unchecked shape, as sign-up does (§4.1).
    const operation = { name: 'bootstrap-account', uniqueRefusals: { Student_email_key: EMAIL_TAKEN } };
    await deps.uow.run(operation, async (tx) => {
      const data: Prisma.StudentUncheckedCreateInput = {
        id,
        email,
        role: input.role,
        ...nameFields(input.displayName),
      };
      await tx.student.create({ data });
    });
  } catch (err) {
    // Like sign-up's losing duplicate (§5.1): only this refusal proves no row
    // names the Supabase Auth user, which is deleted, best effort.
    if (err instanceof Refusal && err.code === 'email_unavailable') {
      await deps.supabase.adminDeleteUser(id);
    }
    throw err;
  }
  return { id, email };
}
