import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { UnitOfWork, type PrismaTx } from '../core/uow';
import { FileWriter } from '../files/file-writer';
import { validateEvidence, type UploadedPart } from '../files/validate';
import { readActiveActor } from '../students/profile-writes';
import { reviewMenteeId } from './review-mentee';
import type { EvidenceView } from './views';

// Inside the transaction: the actor is Active and is the Mentee of this
// Review's Match. The role is never read, so a Mentee promoted to ADMIN after
// the Match was created keeps the path, and the Mentor and every other Admin
// are refused (§9.4, ADR-0009 d5).
async function readOwnReview(tx: PrismaTx, actor: Actor, reviewId: string): Promise<void> {
  await readActiveActor(tx, actor.studentId);
  if ((await reviewMenteeId(tx, reviewId)) !== actor.studentId) throw new ApiError('forbidden');
}

// §3.4's `reviews` module owns `Evidence`: the Mentee's upload, replacement
// and deletion (§9.4). FileWriter keeps §9.8's order, the file before its
// row and deleted after it. The route's pre-check has already refused anyone
// but this Review's Mentee before Multer read the body; the transaction
// checks again.
@Injectable()
export class EvidenceService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly files: FileWriter,
  ) {}

  // `PUT /api/reviews/:reviewId/evidence` (§9.4, §9.8 Saving): validate the
  // bytes, then the save upserts the one row, and after commit the replaced
  // file is deleted. Put against put or delete on one Review serializes; the
  // later commit wins.
  async putEvidence(actor: Actor, reviewId: string, part: UploadedPart | undefined): Promise<EvidenceView> {
    if (part === undefined) throw new ApiError('validation_failed');
    // Every refusal comes before the upload (§9.4).
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

  // `DELETE /api/reviews/:reviewId/evidence` (§9.4, §9.8 Deleting): the same
  // authorization, idempotent; the row in the transaction, then the file
  // after commit.
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
