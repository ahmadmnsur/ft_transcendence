import { ApiError } from '../core/errors';
import type { PrismaTx } from '../core/uow';
import type { Role } from '../shared/roles';
import { readActiveAdmin } from '../students/profile-writes';
import { lastActiveAdmin, selfActionForbidden, studentRemoved } from './refusals';

// The `tx` helpers every Users-table write runs inside its own SSI
// transaction (§12.7), so the role change here and the sanctions after it
// read the same way.

// The target as a write reads it: what the edits pass on, and what the
// active-Admin guard counts.
export type UsersTableTarget = {
  id: string;
  email: string;
  role: Role;
  suspendedAt: Date | null;
  learningGoalStudentSkillId: string | null;
};

// §12.7's common reads, in its order: the actor, an Active Admin; the target,
// unknown → 404; the actor is not the target, for a role change or a
// sanction (`self: 'forbidden'`), while an edit may name the Admin themselves
// (§5.7); and the target is not Removed, since a Removed row is view-only.
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

// ADR-0008 d9: an action that takes an active Admin (role ADMIN, neither flag
// set) out of that set commits only if another one remains. The count is read
// inside the action's own transaction, so two such actions racing have one
// serial order (§3.6.3). The actor, read in the same snapshot, is already an
// active Admin other than the target, so this is the rule's backstop rather
// than a refusal normal use reaches.
export async function keepAnActiveAdmin(tx: PrismaTx, target: UsersTableTarget): Promise<void> {
  if (target.role !== 'ADMIN' || target.suspendedAt !== null) return;
  const others = await tx.student.count({
    where: { role: 'ADMIN', suspendedAt: null, removedAt: null, id: { not: target.id } },
  });
  if (others === 0) throw lastActiveAdmin();
}
