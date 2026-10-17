import { Injectable } from '@nestjs/common';

// Which sockets revokeSessions drops (§7.5): every socket of a Student, or only
// the ones a single session authenticated.
export type RevokeTarget = { studentId: string } | { sessionHash: string };

// The port for every server-to-client event (§7.4) plus revokeSessions.
// Services call it only from ctx.afterCommit (§3.7); the socket gateway
// implements it. Payload types are narrowed by the slices that define them.
export abstract class RealtimePublisher {
  // post:created to `feed`: the full feed item (§6.9).
  abstract postCreated(item: object): void;

  // round:opened to `rounds`.
  abstract roundOpened(): void;

  // round:closed to `rounds`.
  abstract roundClosed(): void;

  // match:ready to `student:<id>` for each Student given.
  abstract matchReady(studentIds: readonly string[]): void;

  // dm:message to `student:<recipientId>` and `student:<senderId>`.
  abstract dmMessage(senderId: string, recipientId: string, message: object): void;

  // presence:update to `student:<friendId>` for each accepted Friend (§7.6).
  abstract presenceUpdate(friendIds: readonly string[], studentId: string, online: boolean): void;

  abstract revokeSessions(target: RevokeTarget): void;
}

// Bound by the seed's plain `CoreModule` import, so the seed publishes
// nothing. The app binds the socket gateway instead, through
// `CoreModule.forApp` (§3.7, §7.4).
@Injectable()
export class NoopRealtimePublisher extends RealtimePublisher {
  postCreated(): void {}
  roundOpened(): void {}
  roundClosed(): void {}
  matchReady(): void {}
  dmMessage(): void {}
  presenceUpdate(): void {}
  revokeSessions(): void {}
}
