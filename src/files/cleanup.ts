import { Injectable } from '@nestjs/common';
import { Clock } from '../core/clock';
import { PrismaService } from '../core/prisma.service';
import { SupabaseStorageClient } from '../core/supabase-storage';
import { FILE_KINDS, FileBuckets, type FileKind } from './buckets';

// §9.8: a file is left alone for its first hour, which protects a save whose
// file exists a moment before its row.
export const CLEANUP_MIN_AGE_MS = 60 * 60 * 1000;

export type CleanupResult = { bucket: string; listed: number; deleted: number };

// §9.8's cleanup: in each bucket, the files no row names that are more than
// an hour old. Each bucket is listed whole before anything is deleted, since
// deleting page by page shifts the list and skips files. Any failure throws;
// the schedule only logs it.
@Injectable()
export class FileCleanup {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageClient,
    private readonly buckets: FileBuckets,
    private readonly clock: Clock,
  ) {}

  // `pageSize` is the list's page size; `08-files` passes a small one so a
  // bucket takes several pages.
  async run(pageSize?: number): Promise<CleanupResult[]> {
    const results: CleanupResult[] = [];
    for (const kind of FILE_KINDS) {
      const bucket = this.buckets[kind];
      const files = await this.storage.listAll(bucket, pageSize);
      // The hour counts back from before the rows are read, which is after
      // the list: a row committed after the read can only name a file under
      // 30 minutes older than the read (the save's 30-minute rule), which
      // the hour keeps, however long this run then takes or sleeps.
      const cutoff = this.clock.now().getTime() - CLEANUP_MIN_AGE_MS;
      const named = await this.namedTokens(kind);
      const stale = files
        .filter((file) => !named.has(file.name) && file.createdAt.getTime() < cutoff)
        .map((file) => file.name);
      await this.storage.remove(bucket, stale);
      results.push({ bucket, listed: files.length, deleted: stale.length });
    }
    return results;
  }

  // The tokens the rows of one kind name: `Avatar.token` or `Evidence.token`.
  private async namedTokens(kind: FileKind): Promise<Set<string>> {
    const rows =
      kind === 'avatars'
        ? await this.prisma.avatar.findMany({ select: { token: true } })
        : await this.prisma.evidence.findMany({ select: { token: true } });
    return new Set(rows.map((row) => row.token));
  }
}
