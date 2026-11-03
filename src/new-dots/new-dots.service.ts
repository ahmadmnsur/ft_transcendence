import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork, type PrismaTx } from '../core/uow';
import { visiblePostsWhere } from '../feed/post-page';
import type { Prisma } from '../generated/prisma/client';
import { currentMatchWhere, MATCH_WAITING_SELECT, matchWaitingAt } from '../matching/current-match';
import { unreadMessagesWhere } from '../messaging/unread';
import { filedBy, readQueueGroups } from '../moderation/groups';
import { readLivePrompt } from '../prompts/live-prompt';
import { feedbackReceivedWhere } from '../reviews/feedback-received';
import type { NewDotKey, NewDots } from '../shared/new-dots';
import type { Role } from '../shared/roles';
import { incomingRequestsWhere } from '../social/incoming-requests';
import { readActiveActor } from '../students/profile-writes';
import type { OpenedPageDto } from './dto';

type OpenedPage = Exclude<NewDotKey, 'feedback'>;

const OPENED_COLUMNS = {
  messages: 'messagesOpenedAt',
  match: 'matchOpenedAt',
  friends: 'friendsOpenedAt',
  prompts: 'promptsOpenedAt',
  reports: 'reportsOpenedAt',
  feed: 'feedOpenedAt',
} as const satisfies { [Page in OpenedPage]: `${Page}OpenedAt` };

const SESSION_SELECT = {
  messagesOpenedAt: true, matchOpenedAt: true, friendsOpenedAt: true,
  promptsOpenedAt: true, reportsOpenedAt: true, feedOpenedAt: true,
  student: { select: { role: true } },
} as const satisfies Prisma.SessionSelect;

type DotsSession = Prisma.SessionGetPayload<{ select: typeof SESSION_SELECT }>;

type Waiting = Record<OpenedPage, Date | null> & { feedback: boolean };

function newer(time: Date | null, opened: Date | null): boolean {
  return time !== null && (opened === null || time > opened);
}

function latest(times: readonly Date[]): Date | null {
  return times.reduce<Date | null>((last, time) => (last === null || time > last ? time : last), null);
}

async function readSession(tx: PrismaTx, actor: Actor): Promise<DotsSession> {
  if (actor.sessionHash === null) throw new ApiError('unauthenticated');
  const session = await tx.session.findUnique({
    where: { id: actor.sessionHash, studentId: actor.studentId },
    select: SESSION_SELECT,
  });
  if (session === null) throw new ApiError('unauthenticated');
  return session;
}

async function readWaiting(tx: PrismaTx, me: string, role: Role): Promise<Waiting> {
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
  let reports: Date | null = null;
  if (role === 'PEER_MODERATOR' || role === 'ADMIN') {
    const { visible } = await readQueueGroups(tx, me, role);
    reports = latest(visible
      .filter(([, group]) => role === 'ADMIN' || !filedBy(group, me))
      .flatMap(([, group]) => group.filter((row) => row.reporterId !== me).map((row) => row.createdAt)));
  }
  const like = await tx.like.findFirst({
    where: { studentId: { not: me }, post: visiblePostsWhere({ authorId: me }) },
    orderBy: { createdAt: 'desc' }, select: { createdAt: true },
  });
  return {
    messages: message?.createdAt ?? null,
    match: matchWaitingAt(match, me),
    friends: request?.createdAt ?? null,
    prompts: live === null || live.answeredByMe ? null : live.prompt?.publishedAt ?? null,
    feedback: feedback !== null,
    reports,
    feed: like?.createdAt ?? null,
  };
}

function toDots(waiting: Waiting, session: DotsSession): NewDots {
  return {
    messages: newer(waiting.messages, session.messagesOpenedAt),
    match: newer(waiting.match, session.matchOpenedAt),
    friends: newer(waiting.friends, session.friendsOpenedAt),
    prompts: newer(waiting.prompts, session.promptsOpenedAt),
    feedback: waiting.feedback,
    reports: newer(waiting.reports, session.reportsOpenedAt),
    feed: newer(waiting.feed, session.feedOpenedAt),
  };
}

async function readNewDots(tx: PrismaTx, actor: Actor): Promise<NewDots> {
  const session = await readSession(tx, actor);
  return toDots(await readWaiting(tx, actor.studentId, session.student.role), session);
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
      const sessionHash = actor.sessionHash;
      if (sessionHash === null) throw new ApiError('unauthenticated');
      if (input.page === 'feedback') {
        const { count } = await tx.privateFeedback.updateMany({
          where: { ...feedbackReceivedWhere(actor.studentId, input.matchId), readAt: null },
          data: { readAt: ctx.now },
        });
        if (count > 0) ctx.afterCommit(() => this.publisher.newDotsChanged({ studentId: actor.studentId }));
        return readNewDots(tx, actor);
      }
      const session = await readSession(tx, actor);
      const waiting = await readWaiting(tx, actor.studentId, session.student.role);
      const seen = waiting[input.page];
      const openedAt = seen !== null && seen > ctx.now ? seen : ctx.now;
      const column = OPENED_COLUMNS[input.page];
      await tx.session.updateMany({
        where: { id: sessionHash, studentId: actor.studentId },
        data: { [column]: openedAt },
      });
      ctx.afterCommit(() => this.publisher.newDotsChanged({ sessionHash }));
      return toDots(waiting, { ...session, [column]: openedAt });
    });
  }
}
