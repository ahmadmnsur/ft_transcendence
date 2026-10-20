import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { Clock } from '../core/clock';
import { ApiError, ConcurrencyExhausted } from '../core/errors';
import { AppLogger, errorFields } from '../core/logger';
import { SupabaseStorageClient } from '../core/supabase-storage';
import { UnitOfWork } from '../core/uow';
import { FileBuckets } from '../files/buckets';
import { validateAvatar, type UploadedPart } from '../files/validate';
import { readActiveActor } from './profile-writes';
import { avatarUrlFor } from './student-ref';

// §9.8: a save still open 30 minutes after its upload finished fails, so a
// process frozen between the upload and the commit, a laptop put to sleep
// say, cannot write its row after another stack's cleanup deleted the file.
const SAVE_DEADLINE_MS = 30 * 60 * 1000;

// The 30-minute rule's failure: 500 internal_error, logged (§3.8.2).
export class AvatarSaveTooLate extends Error {
  constructor() {
    super('The avatar save reached its last step more than 30 minutes after its upload.');
  }
}

// §3.4's `students` module owns `Avatar`: the owner's upload, replacement
// and deletion (§6.3, §9.6). The file is written before its row and deleted
// after it (§9.8), so a crash can leave a file no row names, never a row
// whose file is missing.
@Injectable()
export class AvatarsService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly storage: SupabaseStorageClient,
    private readonly buckets: FileBuckets,
    private readonly clock: Clock,
    private readonly logger: AppLogger,
  ) {}

  // `PUT /api/me/avatar` (§6.3, §9.8 Saving): validate the bytes, make a new
  // token, upload the file under it, then the transaction upserts the row,
  // and after commit the replaced file is deleted. Two uploads serialize; the
  // later commit wins and deletes the earlier file.
  async putAvatar(actor: Actor, part: UploadedPart | undefined): Promise<{ avatarUrl: string | null }> {
    if (part === undefined) throw new ApiError('validation_failed');
    // Every refusal comes before the upload (§6.3).
    const file = validateAvatar(part);
    const token = randomUUID();
    await this.storage.upload(this.buckets.avatars, token, file.bytes, file.mime);
    const uploadedAt = this.clock.now();
    // Set as the work's last step. The Unit of Work rethrows an error from
    // `work` and one at COMMIT alike (src/core/uow.ts); this mark tells them
    // apart.
    let workFinished = false;
    try {
      await this.uow.run('avatar-save', async (tx, ctx) => {
        workFinished = false;
        // Postgres ends a transaction whose client froze after the 30-minute
        // check below, instead of letting it commit on waking (§9.8).
        await tx.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '15s'`;
        await readActiveActor(tx, actor.studentId);
        const previous = await tx.avatar.findUnique({
          where: { studentId: actor.studentId },
          select: { token: true },
        });
        await ctx.checkpoint('avatar-save');
        const fields = { token, mime: file.mime, size: file.size, uploadedAt };
        await tx.avatar.upsert({
          where: { studentId: actor.studentId },
          create: { studentId: actor.studentId, ...fields },
          update: fields,
        });
        // The replaced file is deleted after commit, after its row (§9.8).
        if (previous !== null) ctx.afterCommit(() => this.removeFile(previous.token));
        // The 30-minute rule, at the work's last step, on the application's
        // clock read now, not the attempt's `ctx.now`.
        if (this.clock.now().getTime() - uploadedAt.getTime() > SAVE_DEADLINE_MS) {
          throw new AvatarSaveTooLate();
        }
        workFinished = true;
      });
    } catch (err) {
      // Nothing can have committed: an error inside the work, a refusal
      // among them, the 30-minute rule, or the retries all used up. Any
      // other failure, a lost connection or a timeout, may have committed
      // with its reply lost, so the file is left to the cleanup, which keeps
      // it if a row names it (§9.8).
      if (!workFinished || err instanceof ConcurrencyExhausted) await this.removeNewFile(token);
      throw err;
    }
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
      ctx.afterCommit(() => this.removeFile(current.token));
    });
    return {};
  }

  // After commit: a failure rejects, and the Unit of Work logs it without
  // failing the committed request (§3.7); the cleanup deletes the file
  // within two hours.
  private removeFile(token: string): Promise<void> {
    return this.storage.remove(this.buckets.avatars, [token]);
  }

  // A failed save's own file, deleted at once. A failure here is logged and
  // never replaces the save's own error; the cleanup deletes the file later.
  private async removeNewFile(token: string): Promise<void> {
    try {
      await this.removeFile(token);
    } catch (err) {
      this.logger.entry('error', { operation: 'avatar-save', step: 'delete-new-file', ...errorFields(err) });
    }
  }
}
