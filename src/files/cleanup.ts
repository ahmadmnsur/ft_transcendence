import { Injectable } from '@nestjs/common';
import { Clock } from '../core/clock';
import { PrismaService } from '../core/prisma.service';
import { SupabaseStorageClient } from '../core/supabase-storage';
import { FILE_KINDS, FileBuckets, type FileKind } from './buckets';

export const CLEANUP_MIN_AGE_MS = 60 * 60 * 1000;

export type CleanupResult = { bucket: string; listed: number; deleted: number };

@Injectable()
export class FileCleanup {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageClient,
    private readonly buckets: FileBuckets,
    private readonly clock: Clock,
  ) {}

  async run(pageSize?: number): Promise<CleanupResult[]> {
    const results: CleanupResult[] = [];
    for (const kind of FILE_KINDS) {
      const bucket = this.buckets[kind];
      const files = await this.storage.listAll(bucket, pageSize);
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

  private async namedTokens(kind: FileKind): Promise<Set<string>> {
    const rows =
      kind === 'avatars'
        ? await this.prisma.avatar.findMany({ select: { token: true } })
        : await this.prisma.evidence.findMany({ select: { token: true } });
    return new Set(rows.map((row) => row.token));
  }
}
