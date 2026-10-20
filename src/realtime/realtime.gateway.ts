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

// §7.4's rooms. A Student's room is `student:<id>`; every socket joins its
// own, and `feed` and `rounds` are shared.
export const FEED_ROOM = 'feed';
export const ROUNDS_ROOM = 'rounds';

export function studentRoom(studentId: string): string {
  return `student:${studentId}`;
}

type SocketSession = { studentId: string; sessionHash: string };

type HeldEvent = { event: string; payload: object };

// §7.3's ack shapes, mirroring the HTTP envelope of §3.8: the value or the
// failure half, the failure's message always the code's own.
type DmSendAck =
  | { ok: true; data: DirectMessageView }
  | { ok: false; error: { code: string; message: string } };

// §7.3's payload, validated in full before the service is called: an object
// with exactly the two keys, a uuid recipient, and a body inside Direct
// Message's limits (§6.0.3) — the same check the SPA runs before it emits.
function dmSendPayload(payload: unknown): { recipientId: string; body: string } | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).length !== 2 || !('recipientId' in record) || !('body' in record)) return null;
  const { recipientId, body } = record;
  if (typeof recipientId !== 'string' || typeof body !== 'string') return null;
  if (!isUuid(recipientId) || !isValidText(body, LIMITS.directMessage, true)) return null;
  return { recipientId, body };
}

// §7.2 step 3 while its re-read is in flight: the rooms the socket will join
// and the events §7.4's publishers emit to them meanwhile. The flush after
// the join delivers them; every path that drops the socket drops the entry
// with it (§7.5).
type WaitingSocket = { rooms: string[]; held: HeldEvent[] };

function socketSession(socket: Socket): SocketSession | null {
  const data = socket.data as Partial<SocketSession>;
  const { studentId, sessionHash } = data;
  if (studentId === undefined || sessionHash === undefined) return null;
  return { studentId, sessionHash };
}

// §3.4's `realtime` module: the Socket.IO gateway owns the rooms, every
// server-to-client event of §7.4 and §7.5's forced disconnect. It implements
// RealtimePublisher, which CoreModule.forApp binds for the app (§3.7).
// `dm:send` (§7.3) is its only client→server handler; nothing else ever gets
// one (§7.3, §19 item 6).
@WebSocketGateway()
export class RealtimeGateway
  extends RealtimePublisher
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private server: Server | null = null;
  private readonly waiting = new Map<string, WaitingSocket>();

  constructor(
    // Only the lazy `dm:send` path touches this: the gateway and the
    // messaging service never name each other in their constructors, because
    // messaging's `RealtimePublisher` binding IS this gateway (§3.7).
    private readonly moduleRef: ModuleRef,
    private readonly sessions: SessionResolver,
    private readonly prisma: PrismaService,
    private readonly registry: PresenceRegistry,
    private readonly audience: PresenceAudience,
    private readonly logger: AppLogger,
  ) {
    super();
    // The registry reports transitions to it, never the other way round, so
    // neither depends on the other's construction. Nest drops this promise,
    // so it must never reject (§7.6).
    this.registry.setListener((transition) => {
      void this.broadcastPresence(transition).catch((err: unknown) => {
        this.logger.entry('error', { operation: 'presence:broadcast', ...errorFields(err) });
      });
    });
  }

  // The session middleware, once the server exists: every connection and
  // every reconnect carries the cookie and runs it (§7.2 step 2).
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
      // §5.3's resolution, no renewal and no write of any kind.
      const session: ActiveSession | null = await this.sessions.resolveActive(cookie.token);
      if (session === null) {
        next(new Error('unauthorized'));
        return;
      }
      const data = socket.data as SocketSession;
      data.studentId = session.studentId;
      data.sessionHash = session.sessionHash;
    } catch (err) {
      // §3.9: an operation name with the error's class, code and frames —
      // never the cookie, the token or its hash. Any other message than
      // `unauthorized` tells the client it is an outage, so it probes
      // instead of signing out (§7.5). The promise is dropped, so it never
      // rejects: the handshake is answered instead.
      this.logger.entry('error', { operation: 'socket-handshake', ...errorFields(err) });
      next(new Error('internal_error'));
      return;
    }
    next();
  }

  // §7.2 step 3, in this order: register, re-read the session row once (a
  // handshake that registers after a revoking commit swept the registry is
  // caught here, because that commit deleted the row first), then join the
  // rooms and apply §7.6's transition. The socket is marked waiting before
  // the first await, so events §7.4's publishers emit while the re-read is
  // in flight are held and flushed right after the join — the client was
  // already told "connected", and §7.5 requires the events missed across it
  // to be recovered. A socket that disconnected while the re-read was in
  // flight was already unregistered by handleDisconnect, and the flush and
  // `activate` both skip it. Nest subscribes to this method and drops the
  // promise it returns, so it must never reject: a failed re-read or join
  // logs (§3.9) and disconnects the socket instead, which unregisters it
  // through handleDisconnect.
  async handleConnection(socket: Socket): Promise<void> {
    const session = socketSession(socket);
    if (session === null) {
      socket.disconnect(true);
      return;
    }
    this.registry.register(socket.id, session.studentId, session.sessionHash);
    // Still synchronous with the connection itself, so no publisher can run
    // between the registration and this entry (§7.2 step 3).
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
        // The row is gone: nothing to join and nothing to deliver.
        this.waiting.delete(socket.id);
        socket.disconnect(true);
        return;
      }
      const waiting = this.waiting.get(socket.id);
      // handleDisconnect removed it while the re-read was in flight: the
      // socket is gone and must join nothing and receive nothing.
      if (waiting === undefined) return;
      // §7.2 step 3: join only now, after the row is confirmed. The
      // in-memory adapter joins synchronously, so no publisher runs between
      // this call and the flush below: an event is either held with the
      // entry (socket not yet in the rooms) or delivered through a room
      // (entry gone, socket in it) — never both, never neither (§7.5).
      const joined = socket.join(waiting.rooms);
      this.waiting.delete(socket.id);
      for (const held of waiting.held) {
        socket.emit(held.event, held.payload);
      }
      await joined;
      this.registry.activate(socket.id);
    } catch (err) {
      // §3.9: an operation name with the error's class, code and frames —
      // never a cookie, a token, a hash or a payload.
      this.waiting.delete(socket.id);
      this.logger.entry('error', { operation: 'socket-connect', ...errorFields(err) });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    // §7.2 step 3 + §7.5: dropping the entry stops a gone socket from
    // joining after its re-read and discards its held events undelivered.
    this.waiting.delete(socket.id);
    this.registry.disconnect(socket.id);
  }

  // §7.3's one client→server event, with its acknowledgement. The service is
  // resolved through the container at call time: MessagingService needs the
  // RealtimePublisher binding, which is this gateway, so neither can name the
  // other in its constructor. At handling time the app's modules are all
  // built, so the lookup always finds messaging's own. Nest subscribes to
  // this method and drops the promise it returns, so it must never reject:
  // every path answers the ack.
  @SubscribeMessage('dm:send')
  async dmSend(socket: Socket, payload: unknown): Promise<DmSendAck> {
    try {
      const session = socketSession(socket);
      if (session === null) return this.errorAck(new ApiError('unauthenticated'));
      // §7.2 step 3 still in flight: the socket is in no room yet and hears
      // nothing until the flush (§7.2, §7.5). Acknowledging busy is cheaper
      // than spending a write in that window.
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

  // Every failure is the envelope's failure half (§3.8), the message the
  // code itself carries. An error the handler cannot name is internal_error,
  // logged the §3.9 way: class, code and frames only — never a payload, a
  // cookie or a token.
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

  // §7.6: the audience is looked up when broadcasting, and a failed lookup
  // drops this one broadcast only — never the process. The check below reads
  // §7.6's "live or grace pending" value (its note of 2026-10-18). The lookup
  // takes time, so a transition the registry has already moved past is
  // dropped: friends must never be told the opposite of what the registry
  // says now. An online transition that resolves inside a later grace window
  // still matches (the registry reads online until the timer fires), and an
  // offline one that resolves after a reconnect does not (the Student is
  // present again).
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

  // §7.4's single exit: one emit to the rooms, plus — while §7.2 step 3's
  // re-read is in flight — one held copy for every waiting socket that will
  // join any of them. Each copy is flushed right after that socket's join,
  // so no event is lost across it and none arrives twice (§7.5). A server
  // that is not yet listening has nothing connected to it and returns.
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
    // An empty list would reach every socket: socket.io broadcasts `to([])`.
    if (studentIds.length === 0) return;
    this.publish([...new Set(studentIds)].map(studentRoom), 'match:ready', {});
  }

  override dmMessage(senderId: string, recipientId: string, message: object): void {
    // One emit to both rooms, so a socket in both receives it once (§7.4).
    this.publish([studentRoom(recipientId), studentRoom(senderId)], 'dm:message', message);
  }

  override presenceUpdate(friendIds: readonly string[], studentId: string, online: boolean): void {
    // An empty list would reach every socket: socket.io broadcasts `to([])`.
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
