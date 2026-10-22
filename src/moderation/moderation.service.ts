import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { UnitOfWork } from '../core/uow';
import { readActiveActor } from '../students/profile-writes';
import { ALREADY_REPORTED, reportTargetInvalid } from './refusals';
import type { ReportInput } from './views';

// §3.4: moderation owns Report. Filing is one transaction with no event or XP.
@Injectable()
export class ModerationService {
  constructor(private readonly uow: UnitOfWork) {}

  // §12.2, ADR-0011 d5: the indexes decide duplicates without reading reports.
  file(actor: Actor, input: ReportInput): Promise<{ received: true }> {
    return this.uow.run({
      name: 'report.file',
      uniqueRefusals: {
        report_one_per_reporter_post: ALREADY_REPORTED,
        report_one_per_reporter_student: ALREADY_REPORTED,
      },
    }, async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const target = input.target;
      if ('postId' in target) {
        const post = await tx.post.findUnique({
          where: { id: target.postId },
          select: { removedAt: true, authorId: true },
        });
        if (post === null || post.removedAt !== null || post.authorId === actor.studentId) {
          throw reportTargetInvalid();
        }
      } else {
        const student = await tx.student.findUnique({
          where: { id: target.studentId },
          select: { id: true, removedAt: true },
        });
        if (student === null || student.removedAt !== null || student.id === actor.studentId) {
          throw reportTargetInvalid();
        }
      }
      await ctx.checkpoint('report.file');
      await tx.report.create({
        data: {
          reporterId: actor.studentId,
          postId: 'postId' in target ? target.postId : null,
          reportedStudentId: 'studentId' in target ? target.studentId : null,
          reason: input.reason,
          text: input.text ?? null,
          createdAt: ctx.now,
        },
      });
      return { received: true };
    });
  }
}
