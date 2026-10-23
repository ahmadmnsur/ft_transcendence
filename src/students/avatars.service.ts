import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { UnitOfWork } from '../core/uow';
import { FileWriter } from '../files/file-writer';
import { validateAvatar, type UploadedPart } from '../files/validate';
import { deleteAvatarRow, writeAvatarRow } from './avatar-writes';
import { readActiveActor } from './profile-writes';
import { avatarUrlFor } from './student-ref';

// §3.4's `students` module owns `Avatar`: the owner's upload, replacement
// and deletion (§6.3, §9.6). FileWriter keeps §9.8's order, the file before
// its row and deleted after it; the row's writes are `avatar-writes.ts`'s,
// which the Users table's routes share (§6.12).
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
      return writeAvatarRow(tx, actor.studentId, file, saved, () => ctx.checkpoint('avatar-save'));
    });
    return { avatarUrl: avatarUrlFor({ token }) };
  }

  // `DELETE /api/me/avatar` (§6.3, §9.8 Deleting): idempotent; the row in the
  // transaction, then the file after commit.
  async deleteAvatar(actor: Actor): Promise<Record<string, never>> {
    await this.uow.run('avatar-delete', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const token = await deleteAvatarRow(tx, actor.studentId, () => ctx.checkpoint('avatar-delete'));
      if (token !== null) this.files.removeAfterCommit(ctx, 'avatars', token);
    });
    return {};
  }
}
