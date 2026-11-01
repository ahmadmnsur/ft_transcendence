import { Injectable } from '@nestjs/common';
import { EMAIL_TAKEN } from '../auth/account-create';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { PrismaService } from '../core/prisma.service';
import { UnitOfWork } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { levelFor, levelProgress } from '../gamification/level';
import { badgeViews } from '../gamification/views';
import { normalizeEmail } from '../shared/limits';
import type { SearchOrder, SearchSort } from './dto';
import { nameSearchWhere } from './name-search';
import { PROFILE_SELECT, deriveStatus, goalOf, skillsOf, type ProfileRow } from './profile-reads';
import {
  applyLearningGoal,
  applySkills,
  clearLearningGoal as clearGoalWrite,
  readActiveActor,
  updateProfileFields,
} from './profile-writes';
import { avatarUrlFor, toStudentRef, STUDENT_REF_SELECT } from './student-ref';
import type {
  LearningGoalView,
  OwnProfile,
  PublicProfile,
  SkillView,
  StudentSearchItem,
  StudentSearchPage,
} from './views';


const OWN_PROFILE_SELECT = {
  ...PROFILE_SELECT,
  email: true,
  fortyTwoId: true,
} as const satisfies Prisma.StudentSelect;

const SEARCH_SELECT = {
  ...STUDENT_REF_SELECT,
  xp: true,
  studentSkills: PROFILE_SELECT.studentSkills,
} as const satisfies Prisma.StudentSelect;

type OwnProfileRow = Prisma.StudentGetPayload<{ select: typeof OWN_PROFILE_SELECT }>;
type SearchRow = Prisma.StudentGetPayload<{ select: typeof SEARCH_SELECT }>;

export type StudentSearchQuery = {
  q?: string;
  teaches?: string;
  wants?: string;
  hasGoal?: boolean;
  sort: SearchSort;
  order: SearchOrder;
  page: number;
  pageSize: number;
};

function toOwnProfile(row: OwnProfileRow): OwnProfile {
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
    fortyTwoConnected: row.fortyTwoId !== null,
  };
}

function toPublicProfile(row: ProfileRow): PublicProfile {
  const student = toStudentRef(row);
  if (row.removedAt !== null) return { student, profile: null };
  return {
    student,
    profile: {
      skills: skillsOf(row.studentSkills),
      learningGoal: goalOf(row),
      ...levelProgress(row.xp),
      streak: row.streak,
      badges: badgeViews(row.badgeAwards),
    },
  };
}

function searchWhere(query: StudentSearchQuery): Prisma.StudentWhereInput {
  const and: Prisma.StudentWhereInput[] = [{ removedAt: null }];
  const name = nameSearchWhere(query.q);
  if (name !== undefined) and.push(name);
  if (query.teaches !== undefined) {
    and.push({ studentSkills: { some: { skillId: query.teaches, kind: 'TEACH' } } });
  }
  if (query.wants !== undefined) {
    and.push({ studentSkills: { some: { skillId: query.wants, kind: 'LEARN' } } });
  }
  if (query.hasGoal !== undefined) {
    and.push({ learningGoalStudentSkillId: query.hasGoal ? { not: null } : null });
  }
  return { AND: and };
}

const SEARCH_ORDER_BY: Record<SearchSort, (order: SearchOrder) => Prisma.StudentOrderByWithRelationInput> = {
  name: (order) => ({ displayName: order }),
  xp: (order) => ({ xp: order }),
  joined: (order) => ({ createdAt: order }),
};

function toSearchItem(row: SearchRow): StudentSearchItem {
  return {
    student: toStudentRef(row),
    skills: skillsOf(row.studentSkills),
    xp: row.xp,
    level: levelFor(row.xp),
  };
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uow: UnitOfWork,
  ) {}

  async listSkills(actor: Actor): Promise<{ items: SkillView[] }> {
    const items = await this.prisma.skill.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    return { items };
  }

  async getOwnProfile(actor: Actor): Promise<OwnProfile> {
    return this.readOwnProfile(actor.studentId);
  }

  private async readOwnProfile(studentId: string): Promise<OwnProfile> {
    return this.uow.readOnly(async (tx) => {
      const row = await tx.student.findUnique({
        where: { id: studentId },
        select: OWN_PROFILE_SELECT,
      });
      if (row === null) throw new ApiError('unauthenticated');
      return toOwnProfile(row);
    });
  }

  async getProfile(actor: Actor, id: string): Promise<PublicProfile> {
    return this.uow.readOnly(async (tx) => {
      const row = await tx.student.findUnique({ where: { id }, select: PROFILE_SELECT });
      if (row === null) throw new ApiError('not_found');
      return toPublicProfile(row);
    });
  }

  async search(actor: Actor, query: StudentSearchQuery): Promise<StudentSearchPage> {
    const where = searchWhere(query);
    return this.uow.readOnly(async (tx) => {
      const total = await tx.student.count({ where });
      const skip = (query.page - 1) * query.pageSize;
      if (skip >= total) return { items: [], total };
      const rows = await tx.student.findMany({
        where,
        orderBy: [SEARCH_ORDER_BY[query.sort](query.order), { id: 'asc' }],
        skip,
        take: query.pageSize,
        select: SEARCH_SELECT,
      });
      return { items: rows.map(toSearchItem), total };
    });
  }

  async updateOwnProfile(
    actor: Actor,
    input: { displayName?: string; email?: string },
  ): Promise<OwnProfile> {
    const email = input.email === undefined ? undefined : normalizeEmail(input.email);
    await this.uow.run(
      { name: 'profile-update', uniqueRefusals: { Student_email_key: EMAIL_TAKEN } },
      async (tx, ctx) => {
        const actorRow = await readActiveActor(tx, actor.studentId);
        await updateProfileFields(
          tx,
          actor.studentId,
          { displayName: input.displayName, email, currentEmail: actorRow.email },
          () => ctx.checkpoint('profile-update'),
        );
      },
    );
    return this.readOwnProfile(actor.studentId);
  }

  async setSkills(actor: Actor, teach: string[], learn: string[]): Promise<{ goalCleared: boolean }> {
    return this.uow.run('skills-update', async (tx, ctx) => {
      const actorRow = await readActiveActor(tx, actor.studentId);
      return applySkills(
        tx,
        actor.studentId,
        teach,
        learn,
        actorRow.learningGoalStudentSkillId,
        () => ctx.checkpoint('skills-update'),
      );
    });
  }

  async setLearningGoal(actor: Actor, skillId: string, text: string): Promise<LearningGoalView> {
    return this.uow.run('learning-goal-set', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      return applyLearningGoal(tx, actor.studentId, skillId, text, () =>
        ctx.checkpoint('learning-goal-set'),
      );
    });
  }

  async clearLearningGoal(actor: Actor): Promise<Record<string, never>> {
    await this.uow.run('learning-goal-clear', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      await clearGoalWrite(tx, actor.studentId, () => ctx.checkpoint('learning-goal-clear'));
    });
    return {};
  }
}
