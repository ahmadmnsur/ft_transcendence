import { ApiError } from '../core/errors';
import type { PrismaTx } from '../core/uow';
import type { Role } from '../shared/roles';
import { readActiveAdmin } from '../students/profile-writes';
import { lastActiveAdmin, selfActionForbidden, studentRemoved } from './refusals';


export type UsersTableTarget = {
  id: string;
  email: string;
  role: Role;
  suspendedAt: Date | null;
  learningGoalStudentSkillId: string | null;
};

export async function readTarget(
  tx: PrismaTx,
  actorId: string,
  targetId: string,
  options: { self: 'allowed' | 'forbidden' },
): Promise<UsersTableTarget> {
  await readActiveAdmin(tx, actorId);
  const target = await tx.student.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      email: true,
      role: true,
      suspendedAt: true,
      removedAt: true,
      learningGoalStudentSkillId: true,
    },
  });
  if (target === null) throw new ApiError('not_found');
  if (options.self === 'forbidden' && target.id === actorId) throw selfActionForbidden();
  if (target.removedAt !== null) throw studentRemoved();
  return {
    id: target.id,
    email: target.email,
    role: target.role,
    suspendedAt: target.suspendedAt,
    learningGoalStudentSkillId: target.learningGoalStudentSkillId,
  };
}

export async function keepAnActiveAdmin(tx: PrismaTx, target: UsersTableTarget): Promise<void> {
  if (target.role !== 'ADMIN' || target.suspendedAt !== null) return;
  const others = await tx.student.count({
    where: { role: 'ADMIN', suspendedAt: null, removedAt: null, id: { not: target.id } },
  });
  if (others === 0) throw lastActiveAdmin();
}
