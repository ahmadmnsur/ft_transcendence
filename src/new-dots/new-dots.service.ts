import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork, type PrismaTx } from '../core/uow';
import { visiblePostsWhere } from '../feed/post-page';
import { currentMatchWhere, MATCH_WAITING_SELECT, matchWaitingAt } from '../matching/current-match';
import { unreadMessagesWhere } from '../messaging/unread';
import { filedBy, readQueueGroups } from '../moderation/groups';
import { readLivePrompt } from '../prompts/live-prompt';
import { feedbackReceivedWhere } from '../reviews/feedback-received';
import type { NewDotKey, NewDots } from '../shared/new-dots';
import { incomingRequestsWhere } from '../social/incoming-requests';
import { readActiveActor } from '../students/profile-writes';
import type { OpenedPageDto } from './dto';

const OPENED_COLUMNS = {
  messages: 'messagesOpenedAt',
  match: 'matchOpenedAt',
  friends: 'friendsOpenedAt',
  prompts: 'promptsOpenedAt',
  reports: 'reportsOpenedAt',
  feed: 'feedOpenedAt',
} as const satisfies { [Page in Exclude<NewDotKey, 'feedback'>]: `${Page}OpenedAt` };

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
    select: MATCH_WAITING_SELECT,
  });
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
      (role === 'ADMIN' || !filedBy(group, me)) &&
      group.some((row) => newer(row.createdAt, session.reportsOpenedAt)),
    );
  }
  const like = await tx.like.findFirst({
    where: { studentId: { not: me }, post: visiblePostsWhere({ authorId: me }) },
    orderBy: { createdAt: 'desc' }, select: { createdAt: true },
  });
  return {
    messages: newer(message?.createdAt, session.messagesOpenedAt),
    match: newer(matchWaitingAt(match, me), session.matchOpenedAt),
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
