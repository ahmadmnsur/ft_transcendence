import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Clock } from '../core/clock';
import { ConcurrencyExhausted } from '../core/errors';
import { AppLogger, errorFields } from '../core/logger';
import { SupabaseStorageClient } from '../core/supabase-storage';
import { UnitOfWork, type PrismaTx, type TxContext } from '../core/uow';
import { FileBuckets, type FileKind } from './buckets';

const SAVE_DEADLINE_MS = 30 * 60 * 1000;

export class FileSaveTooLate extends Error {
  constructor(operation: string) {
    super(`The ${operation} reached its last step more than 30 minutes after its upload.`);
  }
}

export type SavedFile = { token: string; uploadedAt: Date };

@Injectable()
export class FileWriter {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly storage: SupabaseStorageClient,
    private readonly buckets: FileBuckets,
    private readonly clock: Clock,
    private readonly logger: AppLogger,
  ) {}

  async save(
    operation: string,
    kind: FileKind,
    file: { bytes: Buffer; mime: string },
    write: (tx: PrismaTx, ctx: TxContext, saved: SavedFile) => Promise<string | null>,
  ): Promise<SavedFile> {
    const token = randomUUID();
    await this.storage.upload(this.buckets[kind], token, file.bytes, file.mime);
    const saved = { token, uploadedAt: this.clock.now() };
    let workFinished = false;
    try {
      await this.uow.run(operation, async (tx, ctx) => {
        workFinished = false;
        await tx.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '15s'`;
        const replaced = await write(tx, ctx, saved);
        if (replaced !== null) this.removeAfterCommit(ctx, kind, replaced);
        if (this.clock.now().getTime() - saved.uploadedAt.getTime() > SAVE_DEADLINE_MS) {
          throw new FileSaveTooLate(operation);
        }
        workFinished = true;
      });
    } catch (err) {
      if (!workFinished || err instanceof ConcurrencyExhausted) await this.removeNewFile(operation, kind, token);
      throw err;
    }
    return saved;
  }

  removeAfterCommit(ctx: TxContext, kind: FileKind, token: string): void {
    ctx.afterCommit(() => this.storage.remove(this.buckets[kind], [token]));
  }

  private async removeNewFile(operation: string, kind: FileKind, token: string): Promise<void> {
    try {
      await this.storage.remove(this.buckets[kind], [token]);
    } catch (err) {
      this.logger.entry('error', { operation, step: 'delete-new-file', ...errorFields(err) });
    }
  }
}
