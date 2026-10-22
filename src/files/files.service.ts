import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import type { RequestAuth } from '../core/session.guard';
import { ApiError } from '../core/errors';
import { PrismaService } from '../core/prisma.service';
import { SupabaseStorageClient } from '../core/supabase-storage';
import { FileBuckets } from './buckets';

// §3.4's `files` module: serving the files. Every read passes through here,
// so no byte is reachable without a session (ADR-0009 d3).
@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageClient,
    private readonly buckets: FileBuckets,
  ) {}

  // §6.3, §9.8 Reading: any signed-in Student may read any avatar. The row by
  // its token, then the whole file from the `avatars` bucket under the row's
  // own token. An unknown token is 404; a row whose file Storage cannot give
  // throws, so it answers 500 internal_error, logged, never 404. `actor` is
  // the viewer the read is for (§3.4).
  async readAvatar(actor: Actor, token: string): Promise<{ bytes: Buffer; mime: string }> {
    const row = await this.prisma.avatar.findUnique({
      where: { token },
      select: { token: true, mime: true },
    });
    if (row === null) throw new ApiError('not_found');
    const bytes = await this.storage.download(this.buckets.avatars, row.token);
    return { bytes, mime: row.mime };
  }

  // §6.3, §9.4 Read, §9.8 Reading: Evidence by its token, for the Mentor and
  // Mentee of the one Match reached through its Review, whatever their role,
  // or anyone whose current role is ADMIN, as the session guard read it for
  // this request (§3.4); anyone else is 403, a Peer Moderator outside that
  // pair included (ADR-0009 d4). An unknown token is 404. Then the whole file
  // from the `evidence` bucket, as for an avatar.
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
