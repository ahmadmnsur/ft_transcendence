import { RealtimePublisher, type RevokeTarget } from '../../src/core/realtime-publisher';

export type RecordedEvent = { event: string; args: unknown[] };

// The harness's stand-in for the socket gateway: it records every call the
// Unit of Work flushes after commit, in order, so a test can assert exactly
// which events a request produced (§3.7, §16.2).
export class RecordingRealtimePublisher extends RealtimePublisher {
  readonly events: RecordedEvent[] = [];

  private record(event: string, ...args: unknown[]): void {
    this.events.push({ event, args });
  }

  postCreated(item: object): void {
    this.record('postCreated', item);
  }

  roundOpened(): void {
    this.record('roundOpened');
  }

  roundClosed(): void {
    this.record('roundClosed');
  }

  matchReady(studentIds: readonly string[]): void {
    this.record('matchReady', studentIds);
  }

  dmMessage(senderId: string, recipientId: string, message: object): void {
    this.record('dmMessage', senderId, recipientId, message);
  }

  presenceUpdate(friendIds: readonly string[], studentId: string, online: boolean): void {
    this.record('presenceUpdate', friendIds, studentId, online);
  }

  revokeSessions(target: RevokeTarget): void {
    this.record('revokeSessions', target);
  }

  clear(): void {
    this.events.length = 0;
  }
}
