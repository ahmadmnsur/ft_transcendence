import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { UnitOfWork } from '../core/uow';
import { FileWriter } from '../files/file-writer';
import { validateAvatar, type UploadedPart } from '../files/validate';
import { readActiveActor } from './profile-writes';
import { avatarUrlFor } from './student-ref';

// §3.4's `students` module owns `Avatar`: the owner's upload, replacement
// and deletion (§6.3, §9.6). FileWriter keeps §9.8's order, the file before
// its row and deleted after it.
@Injectable()
export class AvatarsService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly files: FileWriter,
  ) {}

  // `PUT /api/me/avatar` (§6.3, §9.8 Saving): validate the bytes, then the
  // save upserts the row, and after commit the replaced file is deleted. Two
  // uploads serialize; the later commit wins and deletes the earlier file.
  async putAvatar(actor: Actor, part: UploadedPart | undefined): Promise<{ avatarUrl: string | null }> {
    if (part === undefined) throw new ApiError('validation_failed');
    // Every refusal comes before the upload (§6.3).
    const file = validateAvatar(part);
    const { token } = await this.files.save('avatar-save', 'avatars', file, async (tx, ctx, saved) => {
      await readActiveActor(tx, actor.studentId);
      const previous = await tx.avatar.findUnique({
        where: { studentId: actor.studentId },
        select: { token: true },
      });
      await ctx.checkpoint('avatar-save');
      const fields = { token: saved.token, mime: file.mime, size: file.size, uploadedAt: saved.uploadedAt };
      await tx.avatar.upsert({
        where: { studentId: actor.studentId },
        create: { studentId: actor.studentId, ...fields },
        update: fields,
      });
      return previous?.token ?? null;
    });
    return { avatarUrl: avatarUrlFor({ token }) };
  }

  // `DELETE /api/me/avatar` (§6.3, §9.8 Deleting): idempotent; the row in the
  // transaction, then the file after commit.
  async deleteAvatar(actor: Actor): Promise<Record<string, never>> {
    await this.uow.run('avatar-delete', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const current = await tx.avatar.findUnique({
        where: { studentId: actor.studentId },
        select: { token: true },
      });
      await ctx.checkpoint('avatar-delete');
      if (current === null) return;
      await tx.avatar.deleteMany({ where: { studentId: actor.studentId } });
      this.files.removeAfterCommit(ctx, 'avatars', current.token);
    });
    return {};
  }
}
