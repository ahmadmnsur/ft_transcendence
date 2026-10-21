import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Clock } from '../core/clock';
import { ConcurrencyExhausted } from '../core/errors';
import { AppLogger, errorFields } from '../core/logger';
import { SupabaseStorageClient } from '../core/supabase-storage';
import { UnitOfWork, type PrismaTx, type TxContext } from '../core/uow';
import { FileBuckets, type FileKind } from './buckets';

// §9.8: a save still open 30 minutes after its upload finished fails, so a
// process frozen between the upload and the commit, a laptop put to sleep
// say, cannot write its row after another stack's cleanup deleted the file.
const SAVE_DEADLINE_MS = 30 * 60 * 1000;

// The 30-minute rule's failure: 500 internal_error, logged (§3.8.2).
export class FileSaveTooLate extends Error {
  constructor(operation: string) {
    super(`The ${operation} reached its last step more than 30 minutes after its upload.`);
  }
}

// The new file a save's row names.
export type SavedFile = { token: string; uploadedAt: Date };

// §9.8 Saving and Deleting, for an avatar's and Evidence's routes alike: the
// file is written before its row and deleted after it, so a crash can leave
// a file no row names, never a row whose file is missing. Each row stays its
// own module's (§3.4): the caller writes it, in the work it passes.
@Injectable()
export class FileWriter {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly storage: SupabaseStorageClient,
    private readonly buckets: FileBuckets,
    private readonly clock: Clock,
    private readonly logger: AppLogger,
  ) {}

  // A save of validated bytes: a new token and the upload under it, then
  // the SSI transaction `operation`, whose `write` makes its reads, its one
  // checkpoint and the row naming `saved.token`, and returns the token of the
  // file that row replaced, or null. After commit that file is deleted.
  async save(
    operation: string,
    kind: FileKind,
    file: { bytes: Buffer; mime: string },
    write: (tx: PrismaTx, ctx: TxContext, saved: SavedFile) => Promise<string | null>,
  ): Promise<SavedFile> {
    const token = randomUUID();
    await this.storage.upload(this.buckets[kind], token, file.bytes, file.mime);
    const saved = { token, uploadedAt: this.clock.now() };
    // Set as the work's last step. The Unit of Work rethrows an error from
    // `work` and one at COMMIT alike (src/core/uow.ts); this mark tells them
    // apart.
    let workFinished = false;
    try {
      await this.uow.run(operation, async (tx, ctx) => {
        workFinished = false;
        // Postgres ends a transaction whose client froze after the 30-minute
        // check below, instead of letting it commit on waking (§9.8).
        await tx.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '15s'`;
        const replaced = await write(tx, ctx, saved);
        // The replaced file is deleted after commit, after its row (§9.8).
        if (replaced !== null) this.removeAfterCommit(ctx, kind, replaced);
        // The 30-minute rule, at the work's last step, on the application's
        // clock read now, not the attempt's `ctx.now`.
        if (this.clock.now().getTime() - saved.uploadedAt.getTime() > SAVE_DEADLINE_MS) {
          throw new FileSaveTooLate(operation);
        }
        workFinished = true;
      });
    } catch (err) {
      // Nothing can have committed: an error inside the work, a refusal
      // among them, the 30-minute rule, or the retries all used up. Any
      // other failure, a lost connection or a timeout, may have committed
      // with its reply lost, so the file is left to the cleanup, which keeps
      // it if a row names it (§9.8).
      if (!workFinished || err instanceof ConcurrencyExhausted) await this.removeNewFile(operation, kind, token);
      throw err;
    }
    return saved;
  }

  // The file a transaction stops naming, deleted after its commit. A failure
  // rejects, and the Unit of Work logs it without failing the committed
  // request (§3.7); the cleanup deletes the file within two hours.
  removeAfterCommit(ctx: TxContext, kind: FileKind, token: string): void {
    ctx.afterCommit(() => this.storage.remove(this.buckets[kind], [token]));
  }

  // A failed save's own file, deleted at once. A failure here is logged and
  // never replaces the save's own error; the cleanup deletes the file later.
  private async removeNewFile(operation: string, kind: FileKind, token: string): Promise<void> {
    try {
      await this.storage.remove(this.buckets[kind], [token]);
    } catch (err) {
      this.logger.entry('error', { operation, step: 'delete-new-file', ...errorFields(err) });
    }
  }
}
