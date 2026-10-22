import { Injectable } from '@nestjs/common';
import { EMAIL_TAKEN } from '../auth/account-create';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { UnitOfWork } from '../core/uow';
import { FileWriter } from '../files/file-writer';
import { validateAvatar, type UploadedPart } from '../files/validate';
import type { Prisma } from '../generated/prisma/client';
import { levelProgress } from '../gamification/level';
import { badgeViews } from '../gamification/views';
import { readStudentMatches } from '../matching/match-views';
import { normalizeEmail } from '../shared/limits';
import type { Role } from '../shared/roles';
import type { StudentStatus } from '../shared/student-status';
import { deleteAvatarRow, writeAvatarRow } from '../students/avatar-writes';
import type { SearchOrder } from '../students/dto';
import { escapeLikePattern, nameSearchWhere } from '../students/name-search';
import { PROFILE_SELECT, deriveStatus, goalOf, skillsOf } from '../students/profile-reads';
import {
  applyLearningGoal,
  applySkills,
  clearLearningGoal as clearGoalWrite,
  updateProfileFields,
} from '../students/profile-writes';
import { avatarUrlFor } from '../students/student-ref';
import type { LearningGoalView } from '../students/views';
import type { UserSort } from './dto';
import { keepAnActiveAdmin, readTarget } from './target';
import type { AdminStudentDetail, AdminStudentPage, AdminStudentRow } from './views';

// §3.4's `admin` module: the Users table and role changes (§6.12, §12.7). It
// owns no table of its own: an edit runs the `students` module's own `tx`
// writes on the target, inside one transaction this module opens, after
// §12.7's common reads. A read runs outside the Unit of Work and relies on
// the role guard's fresh per-request read (§3.4, §5.3).

// What `listUsers` filters, sorts and pages by; the DTO fills the defaults.
export type UsersQuery = {
  q?: string;
  role?: Role;
  status?: StudentStatus;
  sort: UserSort;
  order: SearchOrder;
  page: number;
  pageSize: number;
};

const ROW_SELECT = {
  id: true,
  displayName: true,
  email: true,
  role: true,
  suspendedAt: true,
  removedAt: true,
  avatar: { select: { token: true } },
} as const satisfies Prisma.StudentSelect;

const DETAIL_SELECT = { ...PROFILE_SELECT, email: true } as const satisfies Prisma.StudentSelect;

type Row = Prisma.StudentGetPayload<{ select: typeof ROW_SELECT }>;
type DetailRow = Prisma.StudentGetPayload<{ select: typeof DETAIL_SELECT }>;

// §4.3.1's derived status as a filter.
const STATUS_WHERE: Record<StudentStatus, Prisma.StudentWhereInput> = {
  ACTIVE: { removedAt: null, suspendedAt: null },
  SUSPENDED: { removedAt: null, suspendedAt: { not: null } },
  REMOVED: { removedAt: { not: null } },
};

// §6.12's `q`: the folded name as Advanced search matches it (§6.2), or the
// email. An email is stored trimmed and lower-cased (§4.3.1), so `q` is too
// for the email match, never folded, before its `\`, `%` and `_` are escaped:
// `Karim.01@` finds `karim.01@…`, and `q=_` only an email holding `_`. A term
// absent or empty after trimming is no filter.
function usersWhere(query: UsersQuery): Prisma.StudentWhereInput {
  const and: Prisma.StudentWhereInput[] = [];
  const name = nameSearchWhere(query.q);
  if (name !== undefined) {
    const email = escapeLikePattern(normalizeEmail(query.q ?? ''));
    and.push({ OR: [name, { email: { contains: email } }] });
  }
  if (query.role !== undefined) and.push({ role: query.role });
  if (query.status !== undefined) and.push(STATUS_WHERE[query.status]);
  return { AND: and };
}

// `sort=name` is a plain order on `displayName`, whose `und-x-icu` collation
// makes every stack sort names alike (§4.3.1); ties `id ASC`.
const ORDER_BY: Record<UserSort, (order: SearchOrder) => Prisma.StudentOrderByWithRelationInput> = {
  name: (order) => ({ displayName: order }),
  email: (order) => ({ email: order }),
};

function toRow(row: Row): AdminStudentRow {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    role: row.role,
    status: deriveStatus(row),
    avatarUrl: avatarUrlFor(row.avatar),
  };
}

function toDetail(row: DetailRow): Omit<AdminStudentDetail, 'matches'> {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    role: row.role,
    status: deriveStatus(row),
    avatarUrl: avatarUrlFor(row.avatar),
    skills: skillsOf(row.studentSkills),
    learningGoal: goalOf(row),
    ...levelProgress(row.xp),
    streak: row.streak,
    badges: badgeViews(row.badgeAwards),
  };
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly files: FileWriter,
  ) {}

  // §6.12's Users table, Removed rows included. The count and the page are
  // two reads, so `readOnly` keeps them one snapshot; a page past the last
  // match reads no rows. `actor` is the Admin the read is for (§3.4).
  async listUsers(actor: Actor, query: UsersQuery): Promise<AdminStudentPage> {
    const where = usersWhere(query);
    return this.uow.readOnly(async (tx) => {
      const total = await tx.student.count({ where });
      const skip = (query.page - 1) * query.pageSize;
      if (skip >= total) return { items: [], total };
      const rows = await tx.student.findMany({
        where,
        orderBy: [ORDER_BY[query.sort](query.order), { id: 'asc' }],
        skip,
        take: query.pageSize,
        select: ROW_SELECT,
      });
      return { items: rows.map(toRow), total };
    });
  }

  // §6.12's detail: the profile and the Matches in one snapshot. Unknown →
  // 404. Never Friends, requests, Blocks or Direct Messages (§4.6): none is
  // read.
  async getUser(actor: Actor, id: string): Promise<AdminStudentDetail> {
    return this.uow.readOnly(async (tx) => {
      const row = await tx.student.findUnique({ where: { id }, select: DETAIL_SELECT });
      if (row === null) throw new ApiError('not_found');
      return { ...toDetail(row), matches: await readStudentMatches(tx, row.id) };
    });
  }

  // `PATCH /api/admin/students/:id`, written as §6.2's `PATCH /api/me`: a
  // name through `nameFields`, an email in `Student.email` alone, Supabase
  // Auth untouched (ADR-0008 d8's note of 2026-10-02). The detail is read
  // after commit.
  async editUser(actor: Actor, id: string, input: { displayName?: string; email?: string }): Promise<AdminStudentDetail> {
    const email = input.email === undefined ? undefined : normalizeEmail(input.email);
    await this.uow.run(
      { name: 'admin-profile-update', uniqueRefusals: { Student_email_key: EMAIL_TAKEN } },
      async (tx, ctx) => {
        const target = await readTarget(tx, actor.studentId, id, { self: 'allowed' });
        await updateProfileFields(
          tx,
          target.id,
          { displayName: input.displayName, email, currentEmail: target.email },
          () => ctx.checkpoint('admin-profile-update'),
        );
      },
    );
    return this.getUser(actor, id);
  }

  // `PUT /api/admin/students/:id/skills`, as §6.2 on the target.
  async setSkills(actor: Actor, id: string, teach: string[], learn: string[]): Promise<{ goalCleared: boolean }> {
    return this.uow.run('admin-skills-update', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'allowed' });
      return applySkills(tx, target.id, teach, learn, target.learningGoalStudentSkillId, () =>
        ctx.checkpoint('admin-skills-update'),
      );
    });
  }

  // `PUT /api/admin/students/:id/learning-goal`, as §6.2 on the target.
  async setLearningGoal(actor: Actor, id: string, skillId: string, text: string): Promise<LearningGoalView> {
    return this.uow.run('admin-learning-goal-set', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'allowed' });
      return applyLearningGoal(tx, target.id, skillId, text, () => ctx.checkpoint('admin-learning-goal-set'));
    });
  }

  // `DELETE /api/admin/students/:id/learning-goal`: clears both, idempotent.
  async clearLearningGoal(actor: Actor, id: string): Promise<Record<string, never>> {
    await this.uow.run('admin-learning-goal-clear', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'allowed' });
      await clearGoalWrite(tx, target.id, () => ctx.checkpoint('admin-learning-goal-clear'));
    });
    return {};
  }

  // `PUT /api/admin/students/:id/avatar`, as §6.3 on the target: every
  // refusal of the bytes before the upload, then §9.8's order, the file, the
  // row, then the old file after commit.
  async putAvatar(actor: Actor, id: string, part: UploadedPart | undefined): Promise<{ avatarUrl: string | null }> {
    if (part === undefined) throw new ApiError('validation_failed');
    const file = validateAvatar(part);
    const { token } = await this.files.save('admin-avatar-save', 'avatars', file, async (tx, ctx, saved) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'allowed' });
      return writeAvatarRow(tx, target.id, file, saved, () => ctx.checkpoint('admin-avatar-save'));
    });
    return { avatarUrl: avatarUrlFor({ token }) };
  }

  // `DELETE /api/admin/students/:id/avatar`: the row, then the file after
  // commit; idempotent.
  async deleteAvatar(actor: Actor, id: string): Promise<Record<string, never>> {
    await this.uow.run('admin-avatar-delete', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'allowed' });
      const token = await deleteAvatarRow(tx, target.id, () => ctx.checkpoint('admin-avatar-delete'));
      if (token !== null) this.files.removeAfterCommit(ctx, 'avatars', token);
    });
    return {};
  }

  // `POST /api/admin/students/:id/role` (§12.7, §5.8): the role alone, with
  // no session or socket change; the target's next request reads it (§5.3).
  // XP, Level, Streak, Badges and Posts stay; the Leaderboard and the Prompt
  // path follow the role when read (§10.8).
  async changeRole(actor: Actor, id: string, role: Role): Promise<{ role: Role }> {
    return this.uow.run('role-change', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'forbidden' });
      if (role !== 'ADMIN') await keepAnActiveAdmin(tx, target);
      await ctx.checkpoint('role-change');
      if (target.role !== role) await tx.student.update({ where: { id: target.id }, data: { role } });
      return { role };
    });
  }
}
