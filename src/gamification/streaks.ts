import type { PrismaTx } from '../core/uow';
import type { Student } from '../generated/prisma/client';

type StreakStudent = Pick<Student, 'id' | 'streak' | 'suspendedAt' | 'removedAt'>;

// §8.7, §10.6: the caller reads every Student and the closing Round's activity
// before its checkpoint. These writes join that same close transaction.
export async function evaluateStreaksAtClose(
  tx: PrismaTx, students: readonly StreakStudent[], qualifying: ReadonlySet<string>, now: Date,
): Promise<{ streaksIncremented: number; streaksReset: number; consistentLearnerAwarded: number }> {
  const incremented: string[] = [];
  const reset: string[] = [];
  const awards: string[] = [];
  for (const student of students) {
    if (student.suspendedAt !== null || student.removedAt !== null) continue;
    if (qualifying.has(student.id)) {
      incremented.push(student.id);
      if (student.streak + 1 >= 3) awards.push(student.id);
    } else if (student.streak !== 0) {
      reset.push(student.id);
    }
  }
  if (incremented.length > 0) {
    await tx.student.updateMany({ where: { id: { in: incremented } }, data: { streak: { increment: 1 } } });
  }
  if (reset.length > 0) {
    await tx.student.updateMany({ where: { id: { in: reset } }, data: { streak: 0 } });
  }
  const inserted = awards.length === 0 ? { count: 0 } : await tx.badgeAward.createMany({
    data: awards.map((studentId) => ({ studentId, badge: 'CONSISTENT_LEARNER' as const, awardedAt: now })),
    skipDuplicates: true,
  });
  return {
    streaksIncremented: incremented.length,
    streaksReset: reset.length,
    consistentLearnerAwarded: inserted.count,
  };
}
