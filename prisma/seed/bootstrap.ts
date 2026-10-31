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

export function assertSignUpFields(
  label: string,
  input: { email: string; password: string; displayName: string },
): void {
  for (const [field, valid] of [
    ['email', isValidEmail(input.email)],
    ['password', isValidPassword(input.password)],
    ['display name', isValidDisplayName(input.displayName)],
  ] as const) {
    if (!valid) throw new SeedFailure(`${label}'s ${field} breaks sign-up's rule`);
  }
}

export async function createStaffAccount(
  input: StaffAccountInput,
  deps: { supabase: SupabaseAuthClient; uow: UnitOfWork },
): Promise<{ id: string; email: string }> {
  assertSignUpFields(`the ${input.role} account`, input);
  const id = uuidv7();
  await deps.supabase.adminCreateUser(id, input.password.trim());
  const email = normalizeEmail(input.email);
  try {
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
    if (err instanceof Refusal && err.code === 'email_unavailable') {
      await deps.supabase.adminDeleteUser(id);
    }
    throw err;
  }
  return { id, email };
}
