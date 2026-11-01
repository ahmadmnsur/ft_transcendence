import type { PrismaService } from '../../src/core/prisma.service';
import type { FeedService } from '../../src/feed/feed.service';
import type { MessagingService } from '../../src/messaging/messaging.service';
import { isValidText, LIMITS } from '../../src/shared/limits';
import type { Role } from '../../src/shared/roles';
import type { SocialService } from '../../src/social/social.service';
import { RESERVED_POSITIONS } from './cohort';
import { SeedFailure } from './failure';


export type ActiveMember = { id: string; position: number; role: Role };

export async function activeCohort(
  prisma: PrismaService,
  cohortIds: readonly string[],
): Promise<ActiveMember[]> {
  const rows = await prisma.student.findMany({
    where: { id: { in: [...cohortIds] }, suspendedAt: null, removedAt: null },
    select: { id: true, role: true },
  });
  const roles = new Map(rows.map((row) => [row.id, row.role]));
  return cohortIds.flatMap((id, position) => {
    const role = roles.get(id);
    if (role === undefined) return [];
    return [{ id, position, role }];
  });
}

export function eligibleStudents(active: readonly ActiveMember[], demoId: string): string[] {
  return active
    .filter((member) => member.role === 'STUDENT' && member.id !== demoId &&
      !RESERVED_POSITIONS.includes(member.position))
    .map((member) => member.id);
}

const ELIGIBLE_STUDENTS = 24;

const GRAPH_COUNTS = { acceptedFriendships: 12, pendingRequests: 2, blocks: 2 } as const;

const UNREAD_FOR_DEMO = 2;

async function befriend(social: SocialService, requesterId: string, addresseeId: string): Promise<void> {
  const request = await social.requestFriend({ studentId: requesterId, sessionHash: null }, addresseeId);
  await social.acceptFriend({ studentId: addresseeId, sessionHash: null }, request.id);
}

export type SocialGraph = {
  firstFriendId: string;
  remaining: string[];
  counts: { acceptedFriendships: number; pendingRequests: number; blocks: number };
};

export async function seedSocialGraph(
  social: SocialService,
  prisma: PrismaService,
  demoId: string,
  eligible: readonly string[],
): Promise<SocialGraph> {
  if (eligible.length !== ELIGIBLE_STUDENTS) {
    throw new SeedFailure(`§14.6 counts ${ELIGIBLE_STUDENTS} eligible Students; there are ${eligible.length}`);
  }
  let taken = 0;
  const take = (count: number): string[] => {
    const ids = eligible.slice(taken, taken + count);
    taken += count;
    return ids;
  };

  const demoFriends = take(6);
  for (const friendId of demoFriends) await befriend(social, demoId, friendId);
  const pairs = take(12);
  for (let index = 0; index < pairs.length; index += 2) await befriend(social, pairs[index], pairs[index + 1]);
  const [p, q] = take(2);
  await befriend(social, p, q);
  await social.block({ studentId: p, sessionHash: null }, q);
  for (const requesterId of take(2)) {
    await social.requestFriend({ studentId: requesterId, sessionHash: null }, demoId);
  }

  const counts = {
    acceptedFriendships: await prisma.friendship.count({ where: { status: 'ACCEPTED' } }),
    pendingRequests: await prisma.friendship.count({ where: { status: 'PENDING' } }),
    blocks: await prisma.block.count(),
  };
  if (counts.acceptedFriendships !== GRAPH_COUNTS.acceptedFriendships ||
      counts.pendingRequests !== GRAPH_COUNTS.pendingRequests || counts.blocks !== GRAPH_COUNTS.blocks) {
    throw new SeedFailure(
      `§14.6's graph: ${counts.acceptedFriendships} accepted Friendships, ${counts.pendingRequests} pending ` +
      `requests and ${counts.blocks} Blocks; expected ${GRAPH_COUNTS.acceptedFriendships}, ` +
      `${GRAPH_COUNTS.pendingRequests} and ${GRAPH_COUNTS.blocks}`,
    );
  }
  return { firstFriendId: demoFriends[0], remaining: eligible.slice(taken), counts };
}

export async function seedLikes(
  feed: FeedService,
  prisma: PrismaService,
  active: readonly string[],
): Promise<{ posts: number; likes: number }> {
  const posts = await prisma.post.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, authorId: true },
  });
  let likes = 0;
  for (const [k, post] of posts.entries()) {
    const likers = active.filter((id) => id !== post.authorId).slice(0, k % 7);
    for (const likerId of likers) {
      await feed.like({ studentId: likerId, sessionHash: null }, post.id);
      likes += 1;
    }
  }
  return { posts: posts.length, likes };
}

const THREAD_A = [
  'Hi! Are you free to go over the evaluation sheet together before Friday?',
  'Sure, Thursday afternoon works for me. Shall we meet on the second floor?',
  'Perfect, see you there at three.',
  "Great. I'll bring my notes from last Round.",
] as const;

const THREAD_B_FROM_DEMO = 'Hi! I liked your answer on the feed. How did you get started?';

const THREAD_B_TO_DEMO = [
  'Thanks! I started with small exercises and asked a peer to review each one.',
  'If you want, we can pair on one this week.',
] as const;

async function send(messaging: MessagingService, senderId: string, recipientId: string, body: string): Promise<void> {
  if (!isValidText(body, LIMITS.directMessage, true)) {
    throw new SeedFailure('a seeded Direct Message breaks its rule');
  }
  await messaging.send({ studentId: senderId, sessionHash: null }, recipientId, body);
}

async function threadBPeer(prisma: PrismaService, demoId: string, remaining: readonly string[]): Promise<string> {
  const friendships = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: demoId }, { addresseeId: demoId }] },
    select: { requesterId: true, addresseeId: true },
  });
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: demoId }, { blockedId: demoId }] },
    select: { blockerId: true, blockedId: true },
  });
  const related = new Set([
    ...friendships.flatMap((row) => [row.requesterId, row.addresseeId]),
    ...blocks.flatMap((row) => [row.blockerId, row.blockedId]),
  ]);
  const peerId = remaining.find((id) => !related.has(id));
  if (peerId === undefined) {
    throw new SeedFailure('§14.6 thread B has no eligible Student left who is neither a Friend of D nor in a Block with D');
  }
  return peerId;
}

export async function seedDirectMessages(
  messaging: MessagingService,
  prisma: PrismaService,
  demoId: string,
  firstFriendId: string,
  remaining: readonly string[],
): Promise<{ messages: number; unreadForDemo: number }> {
  for (const [index, body] of THREAD_A.entries()) {
    if (index % 2 === 0) await send(messaging, demoId, firstFriendId, body);
    else await send(messaging, firstFriendId, demoId, body);
  }
  await messaging.markThreadRead({ studentId: demoId, sessionHash: null }, firstFriendId);
  await messaging.markThreadRead({ studentId: firstFriendId, sessionHash: null }, demoId);

  const peerId = await threadBPeer(prisma, demoId, remaining);
  await send(messaging, demoId, peerId, THREAD_B_FROM_DEMO);
  for (const body of THREAD_B_TO_DEMO) await send(messaging, peerId, demoId, body);
  await messaging.markThreadRead({ studentId: peerId, sessionHash: null }, demoId);

  const unreadForDemo = await prisma.directMessage.count({ where: { recipientId: demoId, readAt: null } });
  if (unreadForDemo !== UNREAD_FOR_DEMO) {
    throw new SeedFailure(`§14.6's threads leave D ${unreadForDemo} unread messages; expected ${UNREAD_FOR_DEMO}`);
  }
  return { messages: THREAD_A.length + 1 + THREAD_B_TO_DEMO.length, unreadForDemo };
}
