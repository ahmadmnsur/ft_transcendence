import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork, type PrismaTx } from '../core/uow';
import { visiblePostsWhere } from '../feed/post-page';
import { currentMatchWhere } from '../matching/matching.service';
import { unreadMessagesWhere } from '../messaging/messaging.service';
import { readQueueGroups } from '../moderation/groups';
import { readLivePrompt } from '../prompts/live-prompt';
import { feedbackReceivedWhere } from '../reviews/reviews.service';
import { incomingRequestsWhere } from '../social/social.service';
import { readActiveActor } from '../students/profile-writes';
import type { OpenedPageDto } from './dto';

export type NewDots = {
  messages: boolean;
  match: boolean;
  friends: boolean;
  prompts: boolean;
  feedback: boolean;
  reports: boolean;
  feed: boolean;
};

const OPENED_COLUMNS = {
  messages: 'messagesOpenedAt',
  match: 'matchOpenedAt',
  friends: 'friendsOpenedAt',
  prompts: 'promptsOpenedAt',
  reports: 'reportsOpenedAt',
  feed: 'feedOpenedAt',
} as const;

function newer(time: Date | null | undefined, opened: Date | null): boolean {
  return time !== null && time !== undefined && (opened === null || time > opened);
}

async function readNewDots(tx: PrismaTx, actor: Actor): Promise<NewDots> {
  if (actor.sessionHash === null) throw new ApiError('unauthenticated');
  const session = await tx.session.findUnique({
    where: { id: actor.sessionHash, studentId: actor.studentId },
    select: {
      messagesOpenedAt: true, matchOpenedAt: true, friendsOpenedAt: true,
      promptsOpenedAt: true, reportsOpenedAt: true, feedOpenedAt: true,
      student: { select: { role: true } },
    },
  });
  if (session === null) throw new ApiError('unauthenticated');
  const me = actor.studentId;
  const role = session.student.role;
  const message = await tx.directMessage.findFirst({
    where: unreadMessagesWhere(me), orderBy: { createdAt: 'desc' }, select: { createdAt: true },
  });
  const match = await tx.match.findFirst({
    where: currentMatchWhere(me),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      status: true, mentorId: true, menteeId: true, createdAt: true,
      mentorAcceptedAt: true, menteeAcceptedAt: true, review: { select: { id: true } },
    },
  });
  let matchTime: Date | null = null;
  if (match !== null) {
    const mine = match.mentorId === me ? match.mentorAcceptedAt : match.menteeAcceptedAt;
    if (match.status === 'MATCHED' && mine === null) matchTime = match.createdAt;
    if (match.status === 'ACCEPTED' && match.menteeId === me && match.review === null) {
      const times = [match.mentorAcceptedAt, match.menteeAcceptedAt].filter((time) => time !== null);
      matchTime = times.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    }
  }
  const request = await tx.friendship.findFirst({
    where: incomingRequestsWhere(me), orderBy: { createdAt: 'desc' }, select: { createdAt: true },
  });
  const live = role === 'ADMIN' ? null : await readLivePrompt(tx, me);
  const feedback = await tx.privateFeedback.findFirst({
    where: { ...feedbackReceivedWhere(me), readAt: null }, select: { id: true },
  });
  let reports = false;
  if (role === 'PEER_MODERATOR' || role === 'ADMIN') {
    const { visible } = await readQueueGroups(tx, me, role);
    reports = visible.some(([, group]) =>
      (role === 'ADMIN' || !group.some((row) => row.reporterId === me)) &&
      group.some((row) => newer(row.createdAt, session.reportsOpenedAt)),
    );
  }
  const like = await tx.like.findFirst({
    where: { studentId: { not: me }, post: visiblePostsWhere({ authorId: me }) },
    orderBy: { createdAt: 'desc' }, select: { createdAt: true },
  });
  return {
    messages: newer(message?.createdAt, session.messagesOpenedAt),
    match: newer(matchTime, session.matchOpenedAt),
    friends: newer(request?.createdAt, session.friendsOpenedAt),
    prompts: live !== null && !live.answeredByMe && newer(live.prompt?.publishedAt, session.promptsOpenedAt),
    feedback: feedback !== null,
    reports,
    feed: newer(like?.createdAt, session.feedOpenedAt),
  };
}

@Injectable()
export class NewDotsService {
  constructor(private readonly uow: UnitOfWork, private readonly publisher: RealtimePublisher) {}

  read(actor: Actor): Promise<NewDots> {
    return this.uow.readOnly((tx) => readNewDots(tx, actor));
  }

  opened(actor: Actor, input: OpenedPageDto): Promise<NewDots> {
    return this.uow.run({ name: 'new-dots.opened' }, async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      if (actor.sessionHash === null) throw new ApiError('unauthenticated');
      if (input.page === 'feedback') {
        await tx.privateFeedback.updateMany({
          where: { ...feedbackReceivedWhere(actor.studentId, input.matchId), readAt: null },
          data: { readAt: ctx.now },
        });
      } else {
        await tx.session.updateMany({
          where: { id: actor.sessionHash, studentId: actor.studentId },
          data: { [OPENED_COLUMNS[input.page]]: ctx.now },
        });
      }
      const dots = await readNewDots(tx, actor);
      const sessionHash = actor.sessionHash;
      ctx.afterCommit(() => this.publisher.newDotsChanged({ sessionHash }));
      return dots;
    });
  }
}
