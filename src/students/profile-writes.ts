import { emailUnavailable } from '../auth/refusals';
import { ApiError } from '../core/errors';
import type { PrismaTx } from '../core/uow';
import type { Prisma, SkillKind } from '../generated/prisma/client';
import { nameFields } from '../shared/fold-name';
import { LIMITS } from '../shared/limits';
import type { Role } from '../shared/roles';
import { goalSkillNotListed } from './refusals';
import type { LearningGoalView } from './views';


export async function readActiveActor(
  tx: PrismaTx,
  actorId: string,
): Promise<{ email: string; learningGoalStudentSkillId: string | null }> {
  const actor = await tx.student.findUnique({
    where: { id: actorId },
    select: { email: true, suspendedAt: true, removedAt: true, learningGoalStudentSkillId: true },
  });
  if (actor === null || actor.suspendedAt !== null || actor.removedAt !== null) {
    throw new ApiError('unauthenticated');
  }
  return { email: actor.email, learningGoalStudentSkillId: actor.learningGoalStudentSkillId };
}

export async function readActiveRole<R extends Role>(tx: PrismaTx, actorId: string, roles: readonly R[]): Promise<R> {
  const actor = await tx.student.findUnique({
    where: { id: actorId },
    select: { role: true, suspendedAt: true, removedAt: true },
  });
  if (actor === null || actor.suspendedAt !== null || actor.removedAt !== null) {
    throw new ApiError('unauthenticated');
  }
  const role = roles.find((allowed) => allowed === actor.role);
  if (role === undefined) throw new ApiError('forbidden');
  return role;
}

export async function readActiveAdmin(tx: PrismaTx, actorId: string): Promise<void> {
  await readActiveRole(tx, actorId, ['ADMIN']);
}

export async function updateProfileFields(
  tx: PrismaTx,
  targetStudentId: string,
  input: { displayName?: string; email?: string; currentEmail: string },
  checkpoint: () => Promise<void>,
): Promise<void> {
  const data: Prisma.StudentUpdateInput = {};
  if (input.displayName !== undefined) {
    const names = nameFields(input.displayName);
    data.displayName = names.displayName;
    data.displayNameSearch = names.displayNameSearch;
  }
  if (input.email !== undefined && input.email !== input.currentEmail) {
    const holder = await tx.student.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (holder !== null) throw emailUnavailable();
    data.email = input.email;
  }
  await checkpoint();
  if (data.displayName !== undefined || data.email !== undefined) {
    await tx.student.update({ where: { id: targetStudentId }, data });
  }
}

export async function applySkills(
  tx: PrismaTx,
  targetStudentId: string,
  teach: readonly string[],
  learn: readonly string[],
  goalStudentSkillId: string | null,
  checkpoint: () => Promise<void>,
): Promise<{ goalCleared: boolean }> {
  const teachIds = teach.map((id) => id.toLowerCase());
  const learnIds = learn.map((id) => id.toLowerCase());
  for (const list of [teachIds, learnIds]) {
    if (list.length > LIMITS.skillList.maxItems) throw new ApiError('validation_failed');
    if (new Set(list).size !== list.length) throw new ApiError('validation_failed');
  }
  const learnSet = new Set(learnIds);
  if (teachIds.some((id) => learnSet.has(id))) throw new ApiError('validation_failed');
  const ids = [...new Set([...teachIds, ...learnIds])];
  const found = await tx.skill.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (found.length !== ids.length) throw new ApiError('validation_failed');

  const current = await tx.studentSkill.findMany({
    where: { studentId: targetStudentId },
    select: { id: true, skillId: true, kind: true },
  });
  const key = (skillId: string, kind: SkillKind): string => `${skillId}:${kind}`;
  const desired = new Map<string, { skillId: string; kind: SkillKind }>();
  for (const skillId of teachIds) desired.set(key(skillId, 'TEACH'), { skillId, kind: 'TEACH' });
  for (const skillId of learnIds) desired.set(key(skillId, 'LEARN'), { skillId, kind: 'LEARN' });
  const currentKeys = new Set(current.map((row) => key(row.skillId, row.kind)));
  const toDelete = current.filter((row) => !desired.has(key(row.skillId, row.kind)));
  const toInsert = [...desired.values()].filter((row) => !currentKeys.has(key(row.skillId, row.kind)));
  const goalCleared =
    goalStudentSkillId !== null && toDelete.some((row) => row.id === goalStudentSkillId);

  await checkpoint();
  if (goalCleared) {
    await tx.student.update({
      where: { id: targetStudentId },
      data: { learningGoalStudentSkillId: null, learningGoalText: null },
    });
  }
  if (toDelete.length > 0) {
    await tx.studentSkill.deleteMany({ where: { id: { in: toDelete.map((row) => row.id) } } });
  }
  if (toInsert.length > 0) {
    await tx.studentSkill.createMany({
      data: toInsert.map((row) => ({ studentId: targetStudentId, ...row })),
      skipDuplicates: true,
    });
  }
  return { goalCleared };
}

export async function applyLearningGoal(
  tx: PrismaTx,
  targetStudentId: string,
  skillId: string,
  text: string,
  checkpoint: () => Promise<void>,
): Promise<LearningGoalView> {
  const row = await tx.studentSkill.findFirst({
    where: { studentId: targetStudentId, skillId, kind: 'LEARN' },
    select: { id: true, skill: { select: { id: true, name: true } } },
  });
  if (row === null) throw goalSkillNotListed();
  const trimmed = text.trim();
  await checkpoint();
  await tx.student.update({
    where: { id: targetStudentId },
    data: { learningGoalStudentSkillId: row.id, learningGoalText: trimmed },
  });
  return { skill: { id: row.skill.id, name: row.skill.name }, text: trimmed };
}

export async function clearLearningGoal(
  tx: PrismaTx,
  targetStudentId: string,
  checkpoint: () => Promise<void>,
): Promise<void> {
  await checkpoint();
  await tx.student.update({
    where: { id: targetStudentId },
    data: { learningGoalStudentSkillId: null, learningGoalText: null },
  });
}
