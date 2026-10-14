import { v7 as uuidv7 } from 'uuid';
import type { Prisma } from '../generated/prisma/client';
import type { Role } from '../shared/roles';
import { SESSION_TTL_SECONDS, maxAgeUntil, newSessionToken } from '../core/session-cookie';
import { PrismaService } from '../core/prisma.service';
import { SupabaseAuthClient } from '../core/supabase-auth';
import { UnitOfWork } from '../core/uow';
import { Refusal, type RefusalSpec } from '../core/errors';
import { nameFields } from '../shared/fold-name';
import { emailUnavailable } from './refusals';

// What sign-up and sign-in hand the browser: the student object, like
// `GET /api/session`'s (§6.1). `avatarUrl` is null: no Avatar table yet.
export type StudentView = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  avatarUrl: null;
};

export function toStudentView(row: {
  id: string;
  displayName: string;
  email: string;
  role: Role;
}): StudentView {
  return { id: row.id, displayName: row.displayName, email: row.email, role: row.role, avatarUrl: null };
}

// Extra `Student` scalar fields the sign-up transaction writes beside the
// account's own. Empty today; #70's 42 sign-up form adds `forty_two_id`
// through it, without changing this function (§5.1).
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

const EMAIL_TAKEN: RefusalSpec = { code: 'email_unavailable', message: 'This email is already in use.' };

// §5.1 sign-up, steps 2–5, as one function: validation and the throttle
// already ran at the boundary. The id is passed with the other scalar fields
// in Prisma's unchecked shape, so the create keeps compiling once the
// Learning Goal's composite foreign key makes `id` a relation field (§4.1).
export async function createAccountWithSession(
  input: { email: string; password: string; displayName: string; extra?: AccountExtraFields },
  deps: AccountCreateDeps,
): Promise<{ student: StudentView; token: string; expiresAt: Date; maxAge: number }> {
  const { prisma, supabase, uow } = deps;
  // Step 2: any row holds the email, Removed ones included.
  const existing = await prisma.student.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing !== null) throw emailUnavailable();
  // Step 3: NestJS makes the id, a UUIDv7, before the Supabase Auth user
  // that shares it.
  const id = uuidv7();
  // Step 4: Supabase admin create, outside the transaction. Unreachable →
  // `busy_retry_later`, with nothing written.
  await supabase.adminCreateUser(id, input.password);
  // Step 5: one SSI transaction writes the `Student` and its `Session`.
  try {
    return await uow.run({ name: 'sign-up', uniqueRefusals: { Student_email_key: EMAIL_TAKEN } }, async (tx, ctx) => {
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
      // The creating transaction purges that Student's expired rows (§5.2).
      // A new account has none; the delete keeps every creation path alike.
      await tx.session.deleteMany({ where: { studentId: id, expiresAt: { lte: ctx.now } } });
      return {
        student: toStudentView(student),
        token: session.token,
        expiresAt,
        maxAge: maxAgeUntil(expiresAt, ctx.now),
      };
    });
  } catch (err) {
    // Two sign-ups of one email: the unique index admits one, and the loser
    // gets `email_unavailable` and its Supabase Auth user is deleted, best
    // effort (§5.1). This refusal can only come from the transaction above:
    // step 2 already threw before any Supabase user existed.
    if (err instanceof Refusal && err.code === 'email_unavailable') {
      await supabase.adminDeleteUser(id);
    }
    throw err;
  }
}
