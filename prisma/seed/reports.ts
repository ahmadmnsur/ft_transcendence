import type { PrismaService } from '../../src/core/prisma.service';
import type { ModerationService } from '../../src/moderation/moderation.service';
import { isValidText, LIMITS } from '../../src/shared/limits';
import type { ReportReason, ReportTarget } from '../../src/shared/reports';
import { SeedFailure } from './failure';


export type ReportFixtures = {
  groupedPostId: string;
  reportedStudentId: string;
  dismissedPostId: string;
  dismissedReporterId: string;
};

const TEXTS = {
  SPAM: 'The same answer is pasted under several Prompts.',
  INAPPROPRIATE_CONTENT: 'The second sentence is not something I want to read on the feed.',
  HARASSMENT: 'Keeps making rude comments about my work during evaluations.',
  OTHER: 'This answer seems to belong under a different Prompt.',
} as const satisfies Record<ReportReason, string>;

async function file(
  moderation: ModerationService,
  reporterId: string,
  target: ReportTarget,
  reason: ReportReason,
): Promise<void> {
  if (!isValidText(TEXTS[reason], LIMITS.reportText, true)) {
    throw new SeedFailure(`the seeded ${reason} report's text breaks its rule`);
  }
  await moderation.file({ studentId: reporterId, sessionHash: null }, { target, reason, text: TEXTS[reason] });
}

export async function seedReports(
  moderation: ModerationService,
  prisma: PrismaService,
  eligible: readonly string[],
  peerModeratorId: string,
): Promise<ReportFixtures> {
  const answers = await prisma.post.findMany({
    where: { authorId: { in: [...eligible] }, promptId: { not: null }, removedAt: null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, authorId: true },
  });
  const usedPosts = new Set<string>();

  const party = (parties: readonly string[]): string => {
    const id = eligible.find((candidate) => !parties.includes(candidate));
    if (id === undefined) throw new SeedFailure('§14.7 has no eligible Student left for a party-slot');
    return id;
  };
  const answerPost = (otherThan: readonly string[]): { postId: string; authorId: string } => {
    for (const authorId of eligible) {
      if (otherThan.includes(authorId)) continue;
      const post = answers.find((answer) => answer.authorId === authorId && !usedPosts.has(answer.id));
      if (post === undefined) continue;
      usedPosts.add(post.id);
      return { postId: post.id, authorId };
    }
    throw new SeedFailure('§14.7 has no eligible author left with an unused Prompt-answer Post');
  };

  const grouped = answerPost([]);
  const spamReporter = party([grouped.authorId]);
  const contentReporter = party([grouped.authorId, spamReporter]);
  await file(moderation, spamReporter, { postId: grouped.postId }, 'SPAM');
  await file(moderation, contentReporter, { postId: grouped.postId }, 'INAPPROPRIATE_CONTENT');

  const reportedStudentId = party([]);
  const harassmentReporter = party([reportedStudentId]);
  await file(moderation, harassmentReporter, { studentId: reportedStudentId }, 'HARASSMENT');

  const dismissed = answerPost([grouped.authorId]);
  const otherReporter = party([dismissed.authorId]);
  await file(moderation, otherReporter, { postId: dismissed.postId }, 'OTHER');
  await moderation.resolvePostGroup({ studentId: peerModeratorId, sessionHash: null }, dismissed.postId, 'DISMISS');

  return {
    groupedPostId: grouped.postId,
    reportedStudentId,
    dismissedPostId: dismissed.postId,
    dismissedReporterId: otherReporter,
  };
}
