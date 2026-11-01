import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import type { RequestAuth } from '../core/session.guard';
import { ApiError } from '../core/errors';
import { PrismaService } from '../core/prisma.service';
import { SupabaseStorageClient } from '../core/supabase-storage';
import { FileBuckets } from './buckets';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageClient,
    private readonly buckets: FileBuckets,
  ) {}

  async readAvatar(actor: Actor, token: string): Promise<{ bytes: Buffer; mime: string }> {
    const row = await this.prisma.avatar.findUnique({
      where: { token },
      select: { token: true, mime: true },
    });
    if (row === null) throw new ApiError('not_found');
    const bytes = await this.storage.download(this.buckets.avatars, row.token);
    return { bytes, mime: row.mime };
  }

  async readEvidence(
    actor: Actor,
    role: RequestAuth['role'],
    token: string,
  ): Promise<{ bytes: Buffer; mime: string; filename: string }> {
    const row = await this.prisma.evidence.findUnique({
      where: { token },
      select: {
        token: true,
        mime: true,
        filename: true,
        review: { select: { match: { select: { mentorId: true, menteeId: true } } } },
      },
    });
    if (row === null) throw new ApiError('not_found');
    const { mentorId, menteeId } = row.review.match;
    if (actor.studentId !== mentorId && actor.studentId !== menteeId && role !== 'ADMIN') {
      throw new ApiError('forbidden');
    }
    const bytes = await this.storage.download(this.buckets.evidence, row.token);
    return { bytes, mime: row.mime, filename: row.filename };
  }
}
