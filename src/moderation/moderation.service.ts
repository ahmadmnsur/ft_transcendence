import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { UnitOfWork } from '../core/uow';
import { readActiveActor } from '../students/profile-writes';
import { ALREADY_REPORTED, reportTargetInvalid } from './refusals';
import type { ReportInput, ReportReceipt } from './views';

// §3.4: moderation owns Report. Filing is one transaction with no event or XP.
@Injectable()
export class ModerationService {
  constructor(private readonly uow: UnitOfWork) {}

  // §12.2, ADR-0011 d5: the indexes decide duplicates without reading reports.
  file(actor: Actor, input: ReportInput): Promise<ReportReceipt> {
    return this.uow.run({
      name: 'report.file',
      uniqueRefusals: {
        report_one_per_reporter_post: ALREADY_REPORTED,
        report_one_per_reporter_student: ALREADY_REPORTED,
      },
    }, async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const target = input.target;
      let columns: { postId: string | null; reportedStudentId: string | null };
      if ('postId' in target) {
        const post = await tx.post.findUnique({
          where: { id: target.postId },
          select: { removedAt: true, authorId: true },
        });
        if (post === null || post.removedAt !== null || post.authorId === actor.studentId) {
          throw reportTargetInvalid();
        }
        columns = { postId: target.postId, reportedStudentId: null };
      } else {
        const student = await tx.student.findUnique({
          where: { id: target.studentId },
          select: { id: true, removedAt: true },
        });
        if (student === null || student.removedAt !== null || student.id === actor.studentId) {
          throw reportTargetInvalid();
        }
        columns = { postId: null, reportedStudentId: target.studentId };
      }
      await ctx.checkpoint('report.file');
      await tx.report.create({
        data: {
          reporterId: actor.studentId,
          ...columns,
          reason: input.reason,
          text: input.text ?? null,
          createdAt: ctx.now,
        },
      });
      return { received: true };
    });
  }
}
