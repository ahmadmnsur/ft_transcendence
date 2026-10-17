import { emailUnavailable } from '../auth/refusals';
import { ApiError } from '../core/errors';
import type { PrismaTx } from '../core/uow';
import type { Prisma, SkillKind } from '../generated/prisma/client';
import { nameFields } from '../shared/fold-name';
import { LIMITS } from '../shared/limits';
import { goalSkillNotListed } from './refusals';
import type { LearningGoalView } from './views';

// §3.4: the internal write logic lives here, taking the target student id, so
// the Admin ticket can later apply the same writes to another Student. Every
// function runs inside a caller's transaction; `checkpoint` is the caller's
// one call, made after the deciding reads and before the first write (§3.6.4).

// §3.4, §4.3.1: a write re-reads the actor's own sanction flags inside its SSI
// transaction. A gone row, a Suspended or a Removed Student writes nothing and
// is refused `unauthenticated`, exactly as the password change's step 4 (§5.1).
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

// §6.2's `PATCH /api/me`: a new display name writes `display_name` and
// `display_name_search` together through `nameFields` (§4.3.1); a new email
// writes `Student.email` alone, Supabase Auth untouched and no mail sent. The
// caller has already normalized the email.
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
    // Removed rows included: any row holding it refuses (§6.2).
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

// §6.2's `PUT /api/me/skills`: diff against the current rows, delete removed
// rows, insert added rows, keep the rows that stay (same id, so a kept Goal
// survives, §4.3.5). Deleting the Goal's row clears both Goal columns first,
// because the composite FK is ON DELETE RESTRICT (M5, §4.3.1).
export async function applySkills(
  tx: PrismaTx,
  targetStudentId: string,
  teach: readonly string[],
  learn: readonly string[],
  goalStudentSkillId: string | null,
  checkpoint: () => Promise<void>,
): Promise<{ goalCleared: boolean }> {
  // `IsUUID` accepts upper case, so the same Skill may arrive in either case.
  // Lower-casing both lists once keeps a row that stays a row: the diff
  // compares ids, and a case-only difference would delete the kept row and
  // insert a new one, clearing a Goal that named it (§4.3.5, §6.2).
  const teachIds = teach.map((id) => id.toLowerCase());
  const learnIds = learn.map((id) => id.toLowerCase());
  // The size and duplicate rules are re-checked here: the seed calls this
  // directly, past the DTO (§6.2).
  for (const list of [teachIds, learnIds]) {
    if (list.length > LIMITS.skillList.maxItems) throw new ApiError('validation_failed');
    if (new Set(list).size !== list.length) throw new ApiError('validation_failed');
  }
  // Every id must exist in the catalogue, else validation_failed (§6.2).
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
    // The diff comes from rows read in this transaction's snapshot, so a
    // duplicate it could see cannot exist and nothing is skipped. The one
    // conflict is a row a concurrent transaction inserted: under SERIALIZABLE
    // `ON CONFLICT DO NOTHING` raises 40001 and the Unit of Work retries it
    // (§3.6.2), while a plain insert would raise 23505 and answer 500.
    await tx.studentSkill.createMany({
      data: toInsert.map((row) => ({ studentId: targetStudentId, ...row })),
      skipDuplicates: true,
    });
  }
  return { goalCleared };
}

// §6.2's `PUT /api/me/learning-goal`: the Skill must be on the target's LEARN
// list; the reference and the trimmed sentence are written together (§4.3.1).
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

// §6.2's `DELETE /api/me/learning-goal`: both Goal columns to null.
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
