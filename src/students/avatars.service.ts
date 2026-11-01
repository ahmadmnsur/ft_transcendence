import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { UnitOfWork } from '../core/uow';
import { FileWriter } from '../files/file-writer';
import { validateAvatar, type UploadedPart } from '../files/validate';
import { deleteAvatarRow, writeAvatarRow } from './avatar-writes';
import { readActiveActor } from './profile-writes';
import { avatarUrlFor } from './student-ref';

@Injectable()
export class AvatarsService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly files: FileWriter,
  ) {}

  async putAvatar(actor: Actor, part: UploadedPart | undefined): Promise<{ avatarUrl: string | null }> {
    if (part === undefined) throw new ApiError('validation_failed');
    const file = validateAvatar(part);
    const { token } = await this.files.save('avatar-save', 'avatars', file, async (tx, ctx, saved) => {
      await readActiveActor(tx, actor.studentId);
      return writeAvatarRow(tx, actor.studentId, file, saved, () => ctx.checkpoint('avatar-save'));
    });
    return { avatarUrl: avatarUrlFor({ token }) };
  }

  async deleteAvatar(actor: Actor): Promise<Record<string, never>> {
    await this.uow.run('avatar-delete', async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const token = await deleteAvatarRow(tx, actor.studentId, () => ctx.checkpoint('avatar-delete'));
      if (token !== null) this.files.removeAfterCommit(ctx, 'avatars', token);
    });
    return {};
  }
}
