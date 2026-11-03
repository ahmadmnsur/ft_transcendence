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
import type { Role } from '../shared/roles';
import { isUuid } from '../shared/uuid';
import { PresenceAudience } from './presence-audience';
import { PresenceRegistry, type PresenceTransition } from './presence-registry';

export const FEED_ROOM = 'feed';
export const ROUNDS_ROOM = 'rounds';
export const STAFF_ROOM = 'staff';

export function studentRoom(studentId: string): string {
  return `student:${studentId}`;
}

function joinsStaff(role: Role): boolean {
  return role === 'PEER_MODERATOR' || role === 'ADMIN';
}

type SocketSession = { studentId: string; sessionHash: string };

type HeldEvent = { rooms: readonly string[]; event: string; payload: object; exceptStudentIds: readonly string[] };

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

const TYPING_RELAY_MS = 1_000;

type TypingRelay = { at: number; shown: boolean; relayedAt: number };

function dmTypingPayload(payload: unknown): { recipientId: string; typing: boolean } | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).length !== 2 || !('recipientId' in record) || !('typing' in record)) return null;
  const { recipientId, typing } = record;
  if (typeof recipientId !== 'string' || typeof typing !== 'boolean' || !isUuid(recipientId)) return null;
  return { recipientId: recipientId.toLowerCase(), typing };
}

type WaitingSocket = {
  studentId: string;
  rooms: string[];
  held: HeldEvent[];
  staffAfterMove?: boolean;
  newDotsChanged?: boolean;
};

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
  private readonly typing = new Map<string, Map<string, TypingRelay>>();

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
      studentId: session.studentId,
      rooms: [FEED_ROOM, ROUNDS_ROOM, studentRoom(session.studentId)],
      held: [],
    });
    try {
      const row = await this.prisma.session.findUnique({
        where: { id: session.sessionHash },
        select: { id: true, student: { select: { role: true } } },
      });
      if (row === null) {
        this.waiting.delete(socket.id);
        socket.disconnect(true);
        return;
      }
      const waiting = this.waiting.get(socket.id);
      if (waiting === undefined) return;
      const staff = waiting.staffAfterMove ?? joinsStaff(row.student.role);
      if (staff) waiting.rooms.push(STAFF_ROOM);
      const joined = socket.join(waiting.rooms);
      this.waiting.delete(socket.id);
      for (const held of waiting.held) {
        if (held.exceptStudentIds.includes(waiting.studentId)) continue;
        if (held.rooms.some((room) => waiting.rooms.includes(room))) socket.emit(held.event, held.payload);
      }
      if (waiting.newDotsChanged) socket.emit('new-dots:changed', {});
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
    const session = socketSession(socket);
    const relayed = this.typing.get(socket.id);
    this.typing.delete(socket.id);
    if (session === null || relayed === undefined) return;
    for (const [recipientId, relay] of relayed) {
      if (relay.shown) void this.relayTypingStop(session, recipientId, () => true);
    }
  }

  private async relayTypingStop(session: SocketSession, recipientId: string, current: () => boolean): Promise<boolean> {
    try {
      const messaging = this.moduleRef.get(MessagingService, { strict: false });
      const peerId = await messaging.typingPeer(
        { studentId: session.studentId, sessionHash: session.sessionHash },
        recipientId,
      );
      if (peerId === null || !current()) return false;
      this.publish([studentRoom(peerId)], 'dm:typing', { studentId: session.studentId, typing: false });
      return true;
    } catch (err) {
      this.logger.entry('error', { operation: 'dm:typing', ...errorFields(err) });
      return false;
    }
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

  @SubscribeMessage('dm:typing')
  async dmTyping(socket: Socket, payload: unknown): Promise<void> {
    const session = socketSession(socket);
    if (session === null || this.waiting.has(socket.id)) return;
    const request = dmTypingPayload(payload);
    if (request === null) return;
    const { recipientId } = request;
    const relayed = this.typing.get(socket.id) ?? new Map<string, TypingRelay>();
    const last = relayed.get(recipientId);
    if (!request.typing) {
      if (last === undefined) return;
      const stopped: TypingRelay = { at: last.at, shown: last.shown, relayedAt: last.relayedAt };
      relayed.set(recipientId, stopped);
      if (!last.shown) return;
      const current = (): boolean => this.typing.get(socket.id)?.get(recipientId) === stopped;
      if (await this.relayTypingStop(session, recipientId, current)) stopped.shown = false;
      return;
    }
    const now = Date.now();
    if (last !== undefined && now - last.at < TYPING_RELAY_MS) return;
    for (const [id, entry] of relayed) {
      if (!entry.shown && now - entry.at >= TYPING_RELAY_MS) relayed.delete(id);
    }
    const relay: TypingRelay = { at: now, shown: last?.shown ?? false, relayedAt: last?.relayedAt ?? 0 };
    relayed.set(recipientId, relay);
    this.typing.set(socket.id, relayed);
    try {
      const messaging = this.moduleRef.get(MessagingService, { strict: false });
      const peerId = await messaging.typingPeer(
        { studentId: session.studentId, sessionHash: session.sessionHash },
        recipientId,
      );
      if (this.typing.get(socket.id)?.get(recipientId) !== relay) return;
      if (peerId === null) {
        relayed.delete(recipientId);
        return;
      }
      const refresh = relay.shown;
      relay.shown = true;
      const relayedAt = Date.now();
      if (refresh && relayedAt - relay.relayedAt < TYPING_RELAY_MS) return;
      relay.relayedAt = relayedAt;
      this.publish([studentRoom(peerId)], 'dm:typing', { studentId: session.studentId, typing: true });
    } catch (err) {
      if (this.typing.get(socket.id)?.get(recipientId) === relay) relayed.delete(recipientId);
      this.logger.entry('error', { operation: 'dm:typing', ...errorFields(err) });
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

  private publish(rooms: readonly string[], event: string, payload: object, exceptStudentIds: readonly string[] = []): void {
    const server = this.server;
    if (server === null) return;
    server.to([...rooms]).except(exceptStudentIds.map(studentRoom)).emit(event, payload);
    for (const waiting of this.waiting.values()) {
      waiting.held.push({ rooms, event, payload, exceptStudentIds });
    }
  }

  override postCreated(item: object): void {
    this.publish([FEED_ROOM], 'post:created', item);
  }

  override postLikes(postId: string, likeCount: number): void {
    this.publish([FEED_ROOM], 'post:likes', { postId, likeCount });
  }

  override postRemoved(postId: string): void {
    this.publish([FEED_ROOM], 'post:removed', { postId });
  }

  override promptPublished(): void {
    this.publish([FEED_ROOM], 'prompt:published', {});
  }

  override reportsChanged(exceptStudentIds: readonly string[]): void {
    this.publish([STAFF_ROOM], 'reports:changed', {}, exceptStudentIds);
  }

  override roleChanged(studentId: string, role: Role): void {
    const server = this.server;
    if (server === null) return;
    const staff = joinsStaff(role);
    for (const socketId of this.registry.socketIds({ studentId })) {
      const waiting = this.waiting.get(socketId);
      if (waiting !== undefined) {
        waiting.staffAfterMove = staff;
        continue;
      }
      const socket = server.sockets.sockets.get(socketId);
      if (staff) void socket?.join(STAFF_ROOM);
      else void socket?.leave(STAFF_ROOM);
    }
    this.publish([studentRoom(studentId)], 'session:changed', {});
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

  override matchChanged(studentIds: readonly string[]): void {
    if (studentIds.length === 0) return;
    this.publish([...new Set(studentIds)].map(studentRoom), 'match:changed', {});
  }

  override friendsChanged(studentIds: readonly string[]): void {
    if (studentIds.length === 0) return;
    this.publish([...new Set(studentIds)].map(studentRoom), 'friends:changed', {});
  }

  override newDotsChanged(target: RevokeTarget): void {
    if ('studentId' in target) {
      this.publish([studentRoom(target.studentId)], 'new-dots:changed', {});
      return;
    }
    const server = this.server;
    if (server === null) return;
    for (const socketId of this.registry.socketIds(target)) {
      const waiting = this.waiting.get(socketId);
      if (waiting !== undefined) waiting.newDotsChanged = true;
      else server.sockets.sockets.get(socketId)?.emit('new-dots:changed', {});
    }
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
