import type { INestApplication } from '@nestjs/common';
import { createAccountWithSession } from '../../src/auth/account-create';
import { createSessionAfterPasswordCheck } from '../../src/auth/session-create';
import { sessionCookieHeader } from '../../src/core/session-cookie';
import { PrismaService } from '../../src/core/prisma.service';
import { SupabaseAuthClient } from '../../src/core/supabase-auth';
import { UnitOfWork } from '../../src/core/uow';
import { createStaffAccount, type StaffRole } from '../../prisma/seed/bootstrap';

export type TestAccount = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  // A ready `Cookie` header for the account's first session.
  cookie: string;
};

let counter = 0;

// A Student made through this ticket's sign-up code: Supabase admin create,
// then the `Student` and its `Session` (§16.2). Bypasses the throttle like
// the seed does: the helpers never cross the HTTP boundary (§5.5). Supabase
// Auth users outlive the truncation between tests, so every email is unique.
export async function createTestAccount(
  app: INestApplication,
  overrides: Partial<Pick<TestAccount, 'email' | 'password' | 'displayName'>> = {},
): Promise<TestAccount> {
  counter += 1;
  const email = overrides.email ?? `t08-student-${Date.now()}-${counter}@peerconnect.test`;
  const password = overrides.password ?? `test-password-${counter}`;
  const displayName = overrides.displayName ?? `Test Student ${counter}`;
  const created = await createAccountWithSession(
    { email, password, displayName },
    {
      prisma: app.get(PrismaService),
      supabase: app.get(SupabaseAuthClient),
      uow: app.get(UnitOfWork),
    },
  );
  return { id: created.student.id, email, password, displayName, cookie: sessionCookieHeader(created.token) };
}

// A staff account made through the seed's own bootstrap function: Supabase
// admin create, then the `Student` with its role (§14.1, §16.2). Its first
// session is opened like `openTestSession`'s, with no password check.
export async function createTestStaff(
  app: INestApplication,
  role: StaffRole,
  overrides: Partial<Pick<TestAccount, 'email' | 'password' | 'displayName'>> = {},
): Promise<TestAccount> {
  counter += 1;
  const email = overrides.email ?? `t09-staff-${Date.now()}-${counter}@peerconnect.test`;
  const password = overrides.password ?? `test-password-${counter}`;
  const displayName = overrides.displayName ?? `Test Staff ${counter}`;
  const created = await createStaffAccount(
    { email, password, displayName, role },
    { supabase: app.get(SupabaseAuthClient), uow: app.get(UnitOfWork) },
  );
  const cookie = await openTestSession(app, created);
  return { id: created.id, email: created.email, password, displayName, cookie };
}

// A session for an existing account, opened by the code sign-in runs after
// Supabase accepts the password: no real password check (§16.2). Returns a
// ready `Cookie` header.
export async function openTestSession(
  app: INestApplication,
  account: Pick<TestAccount, 'id'>,
): Promise<string> {
  const row = await app
    .get(PrismaService)
    .student.findUnique({ where: { id: account.id }, select: { passwordVersion: true } });
  if (row === null) throw new Error('openTestSession: the Student is gone.');
  const session = await createSessionAfterPasswordCheck(
    { studentId: account.id, expectedPasswordVersion: row.passwordVersion },
    { uow: app.get(UnitOfWork) },
  );
  return sessionCookieHeader(session.token);
}
