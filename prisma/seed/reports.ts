import type { PrismaService } from '../../src/core/prisma.service';
import type { ModerationService } from '../../src/moderation/moderation.service';
import { isValidText, LIMITS } from '../../src/shared/limits';
import type { ReportReason, ReportTarget } from '../../src/shared/reports';
import { SeedFailure } from './failure';

// §14.4 step 5's last part, the report fixtures (§14.7, ADR-0017 d7): three
// groups, four Report rows, filed through the moderation service as each
// reporter, and the third dismissed by the Peer Moderator through §12.5.

// What §14.8 check 6 looks for in the moderation service's own reads.
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
  // The DTO's rule for the text, which the seed checks itself (§12.2).
  if (!isValidText(TEXTS[reason], LIMITS.reportText, true)) {
    throw new SeedFailure(`the seeded ${reason} report's text breaks its rule`);
  }
  await moderation.file({ studentId: reporterId, sessionHash: null }, { target, reason, text: TEXTS[reason] });
}

// §14.7's parties are eligible Students, taken again from the start of the
// eligible order. Each party-slot takes the first not already a party to the
// same fixture; a Post author is the first such Student with a Prompt-answer
// Post no earlier fixture used, and that Post is their oldest unused one.
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
  // `otherThan` keeps fixture 3 on another author than fixture 1's.
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

  // 1. Grouped open Post reports: two reporters, one Post.
  const grouped = answerPost([]);
  const spamReporter = party([grouped.authorId]);
  const contentReporter = party([grouped.authorId, spamReporter]);
  await file(moderation, spamReporter, { postId: grouped.postId }, 'SPAM');
  await file(moderation, contentReporter, { postId: grouped.postId }, 'INAPPROPRIATE_CONTENT');

  // 2. Open Student report. R is not eligible, so it never targets R.
  const reportedStudentId = party([]);
  const harassmentReporter = party([reportedStudentId]);
  await file(moderation, harassmentReporter, { studentId: reportedStudentId }, 'HARASSMENT');

  // 3. Resolved: the Peer Moderator dismisses it.
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
