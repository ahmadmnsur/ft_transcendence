import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { UnitOfWork, type PrismaTx } from '../core/uow';
import { FileWriter } from '../files/file-writer';
import { validateEvidence, type UploadedPart } from '../files/validate';
import { readActiveActor } from '../students/profile-writes';
import { reviewMenteeId } from './review-mentee';
import type { EvidenceView } from './views';

async function readOwnReview(tx: PrismaTx, actor: Actor, reviewId: string): Promise<void> {
  await readActiveActor(tx, actor.studentId);
  if ((await reviewMenteeId(tx, reviewId)) !== actor.studentId) throw new ApiError('forbidden');
}

@Injectable()
export class EvidenceService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly files: FileWriter,
  ) {}

  async putEvidence(actor: Actor, reviewId: string, part: UploadedPart | undefined): Promise<EvidenceView> {
    if (part === undefined) throw new ApiError('validation_failed');
    const file = await validateEvidence(part);
    const { token } = await this.files.save('evidence-save', 'evidence', file, async (tx, ctx, saved) => {
      await readOwnReview(tx, actor, reviewId);
      const previous = await tx.evidence.findUnique({ where: { reviewId }, select: { token: true } });
      await ctx.checkpoint('evidence-save');
      const fields = {
        token: saved.token,
        mime: file.mime,
        size: file.size,
        filename: file.filename,
        uploadedAt: saved.uploadedAt,
      };
      await tx.evidence.upsert({ where: { reviewId }, create: { reviewId, ...fields }, update: fields });
      return previous?.token ?? null;
    });
    return { token, mime: file.mime, size: file.size, filename: file.filename };
  }

  async deleteEvidence(actor: Actor, reviewId: string): Promise<Record<string, never>> {
    await this.uow.run('evidence-delete', async (tx, ctx) => {
      await readOwnReview(tx, actor, reviewId);
      const current = await tx.evidence.findUnique({ where: { reviewId }, select: { token: true } });
      await ctx.checkpoint('evidence-delete');
      if (current === null) return;
      await tx.evidence.deleteMany({ where: { reviewId } });
      this.files.removeAfterCommit(ctx, 'evidence', current.token);
    });
    return {};
  }
}
