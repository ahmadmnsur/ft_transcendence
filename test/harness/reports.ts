import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/core/prisma.service';
import { ModerationService } from '../../src/moderation/moderation.service';
import type { ReportReason, ReportTarget } from '../../src/shared/reports';

export async function createTestPost(app: INestApplication, authorId: string, body = 'Read an index plan.'): Promise<string> {
  const prisma = app.get(PrismaService);
  const [prompt] = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "ReflectionPrompt" (id, question, publication_order)
    SELECT gen_random_uuid(), 'What did you learn?', COALESCE(MAX(publication_order), 0) + 1
      FROM "ReflectionPrompt"
    RETURNING id::text`;
  const [post] = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "Post" (id, author_id, body, prompt_id)
    VALUES (gen_random_uuid(), ${authorId}::uuid, ${body}, ${prompt.id}::uuid)
    RETURNING id::text`;
  return post.id;
}

export async function fileTestReport(
  app: INestApplication,
  reporterId: string,
  target: ReportTarget,
  reason: ReportReason = 'SPAM',
  text?: string,
): Promise<void> {
  await app.get(ModerationService).file({ studentId: reporterId, sessionHash: null }, { target, reason, text });
}
