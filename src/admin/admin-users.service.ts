import { Injectable } from '@nestjs/common';
import { EMAIL_TAKEN } from '../auth/account-create';
import { deleteEverySession } from '../auth/sign-out';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork } from '../core/uow';
import { FileWriter } from '../files/file-writer';
import { validateAvatar, type UploadedPart } from '../files/validate';
import type { Prisma } from '../generated/prisma/client';
import { levelProgress } from '../gamification/level';
import { badgeViews } from '../gamification/views';
import { readStudentMatches } from '../matching/match-views';
import { readInProgressMatchIds, terminateMatches } from '../matching/terminations';
import { closeGroup, openRows } from '../moderation/group-writes';
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
import { alreadySuspended, notSuspended } from './refusals';
import { keepAnActiveAdmin, readTarget } from './target';
import type { AdminStudentDetail, AdminStudentPage, AdminStudentRow } from './views';


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

const STATUS_WHERE: Record<StudentStatus, Prisma.StudentWhereInput> = {
  ACTIVE: { removedAt: null, suspendedAt: null },
  SUSPENDED: { removedAt: null, suspendedAt: { not: null } },
  REMOVED: { removedAt: { not: null } },
};

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
    private readonly publisher: RealtimePublisher,
  ) {}

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

  async getUser(actor: Actor, id: string): Promise<AdminStudentDetail> {
    return this.uow.readOnly(async (tx) => {
      const row = await tx.student.findUnique({ where: { id }, select: DETAIL_SELECT });
      if (row === null) throw new ApiError('not_found');
      return { ...toDetail(row), matches: await readStudentMatches(tx, row.id) };
    });
  }

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

  async setSkills(actor: Actor, id: string, teach: string[], learn: string[]): Promise<{ goalCleared: boolean }> {
    return this.uow.run('admin-skills-update', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'allowed' });
      return applySkills(tx, target.id, teach, learn, target.learningGoalStudentSkillId, () =>
        ctx.checkpoint('admin-skills-update'),
      );
    });
  }

  async setLearningGoal(actor: Actor, id: string, skillId: string, text: string): Promise<LearningGoalView> {
    return this.uow.run('admin-learning-goal-set', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'allowed' });
      return applyLearningGoal(tx, target.id, skillId, text, () => ctx.checkpoint('admin-learning-goal-set'));
    });
  }

  async clearLearningGoal(actor: Actor, id: string): Promise<Record<string, never>> {
    await this.uow.run('admin-learning-goal-clear', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'allowed' });
      await clearGoalWrite(tx, target.id, () => ctx.checkpoint('admin-learning-goal-clear'));
    });
    return {};
  }

  async putAvatar(actor: Actor, id: string, part: UploadedPart | undefined): Promise<{ avatarUrl: string | null }> {
    if (part === undefined) throw new ApiError('validation_failed');
    const file = validateAvatar(part);
    const { token } = await this.files.save('admin-avatar-save', 'avatars', file, async (tx, ctx, saved) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'allowed' });
      return writeAvatarRow(tx, target.id, file, saved, () => ctx.checkpoint('admin-avatar-save'));
    });
    return { avatarUrl: avatarUrlFor({ token }) };
  }

  async deleteAvatar(actor: Actor, id: string): Promise<Record<string, never>> {
    await this.uow.run('admin-avatar-delete', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'allowed' });
      const token = await deleteAvatarRow(tx, target.id, () => ctx.checkpoint('admin-avatar-delete'));
      if (token !== null) this.files.removeAfterCommit(ctx, 'avatars', token);
    });
    return {};
  }

  async changeRole(actor: Actor, id: string, role: Role): Promise<{ role: Role }> {
    return this.uow.run('role-change', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'forbidden' });
      if (role !== 'ADMIN') await keepAnActiveAdmin(tx, target);
      await ctx.checkpoint('role-change');
      if (target.role !== role) {
        await tx.student.update({ where: { id: target.id }, data: { role } });
        ctx.afterCommit(() => this.publisher.roleChanged(target.id, role));
      }
      return { role };
    });
  }

  async suspend(actor: Actor, id: string): Promise<{ status: StudentStatus }> {
    return this.uow.run('student-suspend', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'forbidden' });
      if (target.suspendedAt !== null) throw alreadySuspended();
      await keepAnActiveAdmin(tx, target);
      const matches = await readInProgressMatchIds(tx, target.id);
      await ctx.checkpoint('student.suspend');
      await tx.student.update({ where: { id: target.id }, data: { suspendedAt: ctx.now } });
      await terminateMatches(tx, matches);
      await deleteEverySession(tx, ctx, this.publisher, target.id);
      return { status: 'SUSPENDED' };
    });
  }

  async reinstate(actor: Actor, id: string): Promise<{ status: StudentStatus }> {
    return this.uow.run('student-reinstate', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'forbidden' });
      if (target.suspendedAt === null) throw notSuspended();
      await ctx.checkpoint('student.reinstate');
      await tx.student.update({ where: { id: target.id }, data: { suspendedAt: null } });
      return { status: 'ACTIVE' };
    });
  }

  async remove(actor: Actor, id: string): Promise<{ status: StudentStatus }> {
    return this.uow.run('student-remove', async (tx, ctx) => {
      const target = await readTarget(tx, actor.studentId, id, { self: 'forbidden' });
      await keepAnActiveAdmin(tx, target);
      const matches = await readInProgressMatchIds(tx, target.id);
      const reports = await openRows(tx, { reportedStudentId: target.id });
      const avatar = await deleteAvatarRow(tx, target.id, () => ctx.checkpoint('student.remove'));
      await tx.student.update({ where: { id: target.id }, data: { removedAt: ctx.now } });
      await terminateMatches(tx, matches);
      await deleteEverySession(tx, ctx, this.publisher, target.id);
      if (reports.length > 0) await closeGroup(tx, ctx, actor.studentId, reports, 'ACTIONED');
      if (avatar !== null) this.files.removeAfterCommit(ctx, 'avatars', avatar);
      return { status: 'REMOVED' };
    });
  }
}
