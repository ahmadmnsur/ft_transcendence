import { Injectable } from '@nestjs/common';
import { EMAIL_TAKEN } from '../auth/account-create';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { PrismaService } from '../core/prisma.service';
import { UnitOfWork } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { levelFor } from '../gamification/level';
import { normalizeEmail } from '../shared/limits';
import {
  applyLearningGoal,
  applySkills,
  clearLearningGoal as clearGoalWrite,
  readActiveActor,
  updateProfileFields,
} from './profile-writes';
import { toStudentRef, STUDENT_REF_SELECT } from './student-ref';
import type {
  LearningGoalView,
  OwnProfile,
  PublicProfile,
  SkillView,
  SkillsView,
  StudentStatus,
} from './views';

// §3.4's `students` module: `Student` profile fields, `StudentSkill` and the
// Learning Goal. A write method takes an Actor and runs in exactly one
// `uow.run`; a read method runs outside the Unit of Work.

// The public profile's StudentRef fields come from the shared select
// (§6.0.1); the Goal and Progress fields are read beside them.
const PROFILE_SELECT = {
  ...STUDENT_REF_SELECT,
  xp: true,
  streak: true,
  suspendedAt: true,
  learningGoalStudentSkillId: true,
  learningGoalText: true,
  studentSkills: {
    orderBy: { skill: { name: 'asc' } },
    select: { id: true, kind: true, skill: { select: { id: true, name: true } } },
  },
} as const satisfies Prisma.StudentSelect;

const OWN_PROFILE_SELECT = { ...PROFILE_SELECT, email: true } as const satisfies Prisma.StudentSelect;

// The row shapes come from the selects, so they cannot drift from what the
// query reads.
type ProfileRow = Prisma.StudentGetPayload<{ select: typeof PROFILE_SELECT }>;
type OwnProfileRow = Prisma.StudentGetPayload<{ select: typeof OWN_PROFILE_SELECT }>;
type SkillRow = ProfileRow['studentSkills'][number];

// §4.3.1: status is derived — removedAt → REMOVED, else suspendedAt →
// SUSPENDED, else ACTIVE.
function deriveStatus(row: Pick<ProfileRow, 'removedAt' | 'suspendedAt'>): StudentStatus {
  if (row.removedAt !== null) return 'REMOVED';
  if (row.suspendedAt !== null) return 'SUSPENDED';
  return 'ACTIVE';
}

// Each list sorted by Skill name (§6.2): the select orders by `skill.name`.
function skillsOf(rows: SkillRow[]): SkillsView {
  const teach: SkillView[] = [];
  const learn: SkillView[] = [];
  for (const row of rows) {
    if (row.kind === 'TEACH') teach.push(row.skill);
    else learn.push(row.skill);
  }
  return { teach, learn };
}

// The Goal's Skill is one of this Student's own rows (M5), so it is among the
// rows already read; the text lives on the Student (§4.3.1).
function goalOf(row: ProfileRow): LearningGoalView | null {
  if (row.learningGoalStudentSkillId === null || row.learningGoalText === null) return null;
  const goalRow = row.studentSkills.find((r) => r.id === row.learningGoalStudentSkillId);
  if (goalRow === undefined) return null;
  return { skill: goalRow.skill, text: row.learningGoalText };
}

function toOwnProfile(row: OwnProfileRow): OwnProfile {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    role: row.role,
    status: deriveStatus(row),
    avatarUrl: null,
    skills: skillsOf(row.studentSkills),
    learningGoal: goalOf(row),
    xp: row.xp,
    level: levelFor(row.xp),
    streak: row.streak,
  };
}

function toPublicProfile(row: ProfileRow): PublicProfile {
  const student = toStudentRef(row);
  // §4.6: a Removed Student is the tombstone with no profile.
  if (row.removedAt !== null) return { student, profile: null };
  return {
    student,
    profile: {
      skills: skillsOf(row.studentSkills),
      learningGoal: goalOf(row),
      xp: row.xp,
      level: levelFor(row.xp),
      streak: row.streak,
    },
  };
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uow: UnitOfWork,
  ) {}

  // §6.2: the catalogue, by name. `actor` is the signed-in viewer the read is
  // for (§3.4); the catalogue does not vary by viewer yet.
  async listSkills(actor: Actor): Promise<{ items: SkillView[] }> {
    const items = await this.prisma.skill.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    return { items };
  }

  // §6.2: own profile; the only route that returns the email.
  async getOwnProfile(actor: Actor): Promise<OwnProfile> {
    return this.readOwnProfile(actor.studentId);
  }

  private async readOwnProfile(studentId: string): Promise<OwnProfile> {
    // The row and its Skill rows are several reads; `readOnly` keeps them one
    // consistent snapshot (§3.6.2).
    return this.uow.readOnly(async (tx) => {
      const row = await tx.student.findUnique({
        where: { id: studentId },
        select: OWN_PROFILE_SELECT,
      });
      // The guard already resolved this actor; a row lost since never returns a
      // profile. NEVER an email beyond this route (§4.6).
      if (row === null) throw new ApiError('unauthenticated');
      return toOwnProfile(row);
    });
  }

  // §6.2: a public profile; never an email, for any viewer, the owner
  // included; never the role beyond `isAdmin` (§4.6). A Suspended Student is
  // shown normally. `actor` is the signed-in viewer the read is for (§3.4);
  // the profile does not vary by viewer yet.
  async getProfile(actor: Actor, id: string): Promise<PublicProfile> {
    return this.uow.readOnly(async (tx) => {
      const row = await tx.student.findUnique({ where: { id }, select: PROFILE_SELECT });
      if (row === null) throw new ApiError('not_found');
      return toPublicProfile(row);
    });
  }

  // §6.2's `PATCH /api/me`. One SSI transaction; the profile is read after
  // commit so the response reflects the committed row.
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

  // §6.2's `PUT /api/me/skills`.
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

  // §6.2's `PUT /api/me/learning-goal`.
  async setLearningGoal(actor: Actor, skillId: string, text: string): Promise<LearningGoalView> {
    return this.uow.run('learning-goal-set', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      return applyLearningGoal(tx, actor.studentId, skillId, text, () =>
        ctx.checkpoint('learning-goal-set'),
      );
    });
  }

  // §6.2's `DELETE /api/me/learning-goal`: clears both columns, idempotent.
  async clearLearningGoal(actor: Actor): Promise<Record<string, never>> {
    await this.uow.run('learning-goal-clear', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      await clearGoalWrite(tx, actor.studentId, () => ctx.checkpoint('learning-goal-clear'));
    });
    return {};
  }
}
