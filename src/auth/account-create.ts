import { v7 as uuidv7 } from 'uuid';
import type { Prisma } from '../generated/prisma/client';
import type { Role } from '../shared/roles';
import { SESSION_TTL_SECONDS, maxAgeUntil, newSessionToken } from '../core/session-cookie';
import { PrismaService } from '../core/prisma.service';
import { SupabaseAuthClient } from '../core/supabase-auth';
import { UnitOfWork, type PrismaTx } from '../core/uow';
import { Refusal, type RefusalSpec } from '../core/errors';
import { nameFields } from '../shared/fold-name';
import { avatarUrlFor } from '../students/student-ref';
import { emailUnavailable } from './refusals';

export type StudentView = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
};

export function toStudentView(row: {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  avatar: { token: string } | null;
}): StudentView {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    role: row.role,
    avatarUrl: avatarUrlFor(row.avatar),
  };
}

export type AccountExtraFields = Omit<
  Prisma.StudentUncheckedCreateInput,
  | 'id'
  | 'email'
  | 'passwordVersion'
  | 'displayName'
  | 'displayNameSearch'
  | 'role'
  | 'xp'
  | 'streak'
  | 'suspendedAt'
  | 'removedAt'
  | 'createdAt'
>;

export type AccountCreateDeps = {
  prisma: PrismaService;
  supabase: SupabaseAuthClient;
  uow: UnitOfWork;
};

export const EMAIL_TAKEN: RefusalSpec = { code: 'email_unavailable', message: 'This email is already in use.' };

export async function createAccountWithSession(
  input: {
    email: string;
    password: string;
    displayName: string;
    extra?: AccountExtraFields;
    uniqueRefusals?: Readonly<Record<string, RefusalSpec>>;
    beforeCreate?: (tx: PrismaTx) => Promise<void>;
  },
  deps: AccountCreateDeps,
): Promise<{ student: StudentView; token: string; expiresAt: Date; maxAge: number }> {
  const { prisma, supabase, uow } = deps;
  const uniqueRefusals: Readonly<Record<string, RefusalSpec>> = {
    Student_email_key: EMAIL_TAKEN,
    ...(input.uniqueRefusals ?? {}),
  };
  const refusalCodes = new Set(Object.values(uniqueRefusals).map((spec) => spec.code));
  const existing = await prisma.student.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing !== null) throw emailUnavailable();
  const id = uuidv7();
  await supabase.adminCreateUser(id, input.password);
  try {
    return await uow.run({ name: 'sign-up', uniqueRefusals }, async (tx, ctx) => {
      if (input.beforeCreate !== undefined) await input.beforeCreate(tx);
      const names = nameFields(input.displayName);
      const data: Prisma.StudentUncheckedCreateInput = {
        id,
        email: input.email,
        displayName: names.displayName,
        displayNameSearch: names.displayNameSearch,
        ...input.extra,
      };
      const student = await tx.student.create({ data });
      const expiresAt = new Date(ctx.now.getTime() + SESSION_TTL_SECONDS * 1000);
      const session = newSessionToken();
      await tx.session.create({ data: { id: session.id, studentId: id, expiresAt } });
      await tx.session.deleteMany({ where: { studentId: id, expiresAt: { lte: ctx.now } } });
      return {
        student: toStudentView({ ...student, avatar: null }),
        token: session.token,
        expiresAt,
        maxAge: maxAgeUntil(expiresAt, ctx.now),
      };
    });
  } catch (err) {
    if (err instanceof Refusal && refusalCodes.has(err.code)) {
      await supabase.adminDeleteUser(id);
    }
    throw err;
  }
}
