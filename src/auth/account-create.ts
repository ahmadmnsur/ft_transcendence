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

// What sign-up and sign-in hand the browser: the student object, like
// `GET /api/session`'s (§6.1). `avatarUrl` is null without an Avatar row,
// as for every new account.
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
  avatar?: { token: string } | null;
}): StudentView {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    role: row.role,
    avatarUrl: avatarUrlFor(row.avatar ?? null),
  };
}

// Extra `Student` scalar fields the sign-up transaction writes beside the
// account's own. The 42 sign-up form passes `fortyTwoId` through it (§5.6 B).
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

// Shared with the seed's bootstrap accounts, which follow sign-up's steps.
export const EMAIL_TAKEN: RefusalSpec = { code: 'email_unavailable', message: 'This email is already in use.' };

// §5.1 sign-up, steps 2–5, as one function: validation and the throttle
// already ran at the boundary. The id is passed with the other scalar fields
// in Prisma's unchecked shape, so the create keeps compiling once the
// Learning Goal's composite foreign key makes `id` a relation field (§4.1).
//
// `extra` carries the caller's own fields (the 42 sign-up form's
// `forty_two_id`, §5.6 B); `uniqueRefusals` maps each additional unique
// backstop to the refusal its violation answers instead of a 500. Either
// duplicate race — the email or one of these uniques — admits exactly one
// winner: the loser is answered with its refusal and has the Supabase Auth
// user it just made deleted, best effort (§5.1, §5.6 B).
//
// `beforeCreate` is the caller's own deciding read inside the transaction,
// before the create (§3.6.3): each transaction in the "One 42 account, one
// Student" pair must itself read whether any row holds the 42 `id`, with
// the unique as the backstop. The 42 sign-up form reads there whether any
// Student, a Removed one included, already holds the draft's 42 `id`, and
// refuses when one does. A refusal it throws must be one `uniqueRefusals`
// answers, so the catch below still deletes the Supabase Auth user. The
// ordinary sign-up passes nothing.
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
    return await uow.run({ name: 'sign-up', uniqueRefusals }, async (tx, ctx) => {
      // §3.6.3: the caller's deciding read, inside this transaction and
      // before the create.
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
    // The loser of a duplicate race: the unique index admits one, and the
    // loser gets its refusal and its Supabase Auth user is deleted, best
    // effort (§5.1). This refusal can only come from the transaction above:
    // step 2 already threw before any Supabase user existed.
    if (err instanceof Refusal && refusalCodes.has(err.code)) {
      await supabase.adminDeleteUser(id);
    }
    throw err;
  }
}
