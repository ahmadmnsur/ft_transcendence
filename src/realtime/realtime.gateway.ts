import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import type { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { ModuleRef } from '@nestjs/core';
import type { Server, Socket } from 'socket.io';
import { PROTOCOL_ERRORS, ApiError, Refusal } from '../core/errors';
import { AppLogger, errorFields } from '../core/logger';
import { PrismaService } from '../core/prisma.service';
import { RealtimePublisher, type RevokeTarget } from '../core/realtime-publisher';
import { parseSessionCookie } from '../core/session-cookie';
import { SessionResolver, type ActiveSession } from '../core/session-resolver';
import { MessagingService } from '../messaging/messaging.service';
import type { DirectMessageView } from '../messaging/views';
import { LIMITS, isValidText } from '../shared/limits';
import { isUuid } from '../shared/uuid';
import { PresenceAudience } from './presence-audience';
import { PresenceRegistry, type PresenceTransition } from './presence-registry';

export const FEED_ROOM = 'feed';
export const ROUNDS_ROOM = 'rounds';

export function studentRoom(studentId: string): string {
  return `student:${studentId}`;
}

type SocketSession = { studentId: string; sessionHash: string };

type HeldEvent = { event: string; payload: object };

type DmSendAck =
  | { ok: true; data: DirectMessageView }
  | { ok: false; error: { code: string; message: string } };

function dmSendPayload(payload: unknown): { recipientId: string; body: string } | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).length !== 2 || !('recipientId' in record) || !('body' in record)) return null;
  const { recipientId, body } = record;
  if (typeof recipientId !== 'string' || typeof body !== 'string') return null;
  if (!isUuid(recipientId) || !isValidText(body, LIMITS.directMessage, true)) return null;
  return { recipientId, body };
}

type WaitingSocket = { rooms: string[]; held: HeldEvent[] };

function socketSession(socket: Socket): SocketSession | null {
  const data = socket.data as Partial<SocketSession>;
  const { studentId, sessionHash } = data;
  if (studentId === undefined || sessionHash === undefined) return null;
  return { studentId, sessionHash };
}

@WebSocketGateway()
export class RealtimeGateway
  extends RealtimePublisher
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private server: Server | null = null;
  private readonly waiting = new Map<string, WaitingSocket>();

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly sessions: SessionResolver,
    private readonly prisma: PrismaService,
    private readonly registry: PresenceRegistry,
    private readonly audience: PresenceAudience,
    private readonly logger: AppLogger,
  ) {
    super();
    this.registry.setListener((transition) => {
      void this.broadcastPresence(transition).catch((err: unknown) => {
        this.logger.entry('error', { operation: 'presence:broadcast', ...errorFields(err) });
      });
    });
  }

  afterInit(server: Server): void {
    this.server = server;
    server.use((socket, next) => {
      void this.authenticate(socket, next);
    });
  }

  private async authenticate(socket: Socket, next: (err?: Error) => void): Promise<void> {
    try {
      const cookie = parseSessionCookie(socket.request.headers.cookie);
      if (cookie.kind !== 'session') {
        next(new Error('unauthorized'));
        return;
      }
      const session: ActiveSession | null = await this.sessions.resolveActive(cookie.token);
      if (session === null) {
        next(new Error('unauthorized'));
        return;
      }
      const data = socket.data as SocketSession;
      data.studentId = session.studentId;
      data.sessionHash = session.sessionHash;
    } catch (err) {
      this.logger.entry('error', { operation: 'socket-handshake', ...errorFields(err) });
      next(new Error('internal_error'));
      return;
    }
    next();
  }

  async handleConnection(socket: Socket): Promise<void> {
    const session = socketSession(socket);
    if (session === null) {
      socket.disconnect(true);
      return;
    }
    this.registry.register(socket.id, session.studentId, session.sessionHash);
    this.waiting.set(socket.id, {
      rooms: [FEED_ROOM, ROUNDS_ROOM, studentRoom(session.studentId)],
      held: [],
    });
    try {
      const row = await this.prisma.session.findUnique({
        where: { id: session.sessionHash },
        select: { id: true },
      });
      if (row === null) {
        this.waiting.delete(socket.id);
        socket.disconnect(true);
        return;
      }
      const waiting = this.waiting.get(socket.id);
      if (waiting === undefined) return;
      const joined = socket.join(waiting.rooms);
      this.waiting.delete(socket.id);
      for (const held of waiting.held) {
        socket.emit(held.event, held.payload);
      }
      await joined;
      this.registry.activate(socket.id);
    } catch (err) {
      this.waiting.delete(socket.id);
      this.logger.entry('error', { operation: 'socket-connect', ...errorFields(err) });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    this.waiting.delete(socket.id);
    this.registry.disconnect(socket.id);
  }

  @SubscribeMessage('dm:send')
  async dmSend(socket: Socket, payload: unknown): Promise<DmSendAck> {
    try {
      const session = socketSession(socket);
      if (session === null) return this.errorAck(new ApiError('unauthenticated'));
      if (this.waiting.has(socket.id)) return this.errorAck(new ApiError('busy_retry_later'));
      const request = dmSendPayload(payload);
      if (request === null) return this.errorAck(new ApiError('validation_failed'));
      const messaging = this.moduleRef.get(MessagingService, { strict: false });
      const data = await messaging.send(
        { studentId: session.studentId, sessionHash: session.sessionHash },
        request.recipientId,
        request.body,
      );
      return { ok: true, data };
    } catch (err) {
      return this.errorAck(err);
    }
  }

  private errorAck(err: unknown): DmSendAck {
    if (err instanceof Refusal) {
      return { ok: false, error: { code: err.code, message: err.message } };
    }
    if (err instanceof ApiError) {
      return { ok: false, error: { code: err.code, message: PROTOCOL_ERRORS[err.code].message } };
    }
    this.logger.entry('error', { operation: 'dm:send', ...errorFields(err) });
    return { ok: false, error: { code: 'internal_error', message: PROTOCOL_ERRORS.internal_error.message } };
  }

  private async broadcastPresence(transition: PresenceTransition): Promise<void> {
    let recipients: readonly string[];
    try {
      recipients = await this.audience.recipients(transition.studentId);
    } catch (err) {
      this.logger.entry('error', { operation: 'presence:audience', ...errorFields(err) });
      return;
    }
    if (this.registry.isOnline(transition.studentId) !== transition.online) return;
    this.presenceUpdate(recipients, transition.studentId, transition.online);
  }

  private publish(rooms: readonly string[], event: string, payload: object): void {
    const server = this.server;
    if (server === null) return;
    server.to([...rooms]).emit(event, payload);
    for (const waiting of this.waiting.values()) {
      if (waiting.rooms.some((room) => rooms.includes(room))) {
        waiting.held.push({ event, payload });
      }
    }
  }

  override postCreated(item: object): void {
    this.publish([FEED_ROOM], 'post:created', item);
  }

  override roundOpened(): void {
    this.publish([ROUNDS_ROOM], 'round:opened', {});
  }

  override roundClosed(): void {
    this.publish([ROUNDS_ROOM], 'round:closed', {});
  }

  override matchReady(studentIds: readonly string[]): void {
    if (studentIds.length === 0) return;
    this.publish([...new Set(studentIds)].map(studentRoom), 'match:ready', {});
  }

  override dmMessage(senderId: string, recipientId: string, message: object): void {
    this.publish([studentRoom(recipientId), studentRoom(senderId)], 'dm:message', message);
  }

  override presenceUpdate(friendIds: readonly string[], studentId: string, online: boolean): void {
    if (friendIds.length === 0) return;
    this.publish([...new Set(friendIds)].map(studentRoom), 'presence:update', {
      studentId,
      online,
    });
  }

  override revokeSessions(target: RevokeTarget): void {
    const server = this.server;
    if (server === null) return;
    for (const socketId of this.registry.socketIds(target)) {
      server.sockets.sockets.get(socketId)?.disconnect(true);
    }
  }
}
