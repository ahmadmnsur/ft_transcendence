import { RealtimePublisher, type RevokeTarget } from '../../src/core/realtime-publisher';
import type { Role } from '../../src/shared/roles';

export type RecordedEvent = { event: string; args: unknown[] };

export class RecordingRealtimePublisher extends RealtimePublisher {
  readonly events: RecordedEvent[] = [];

  private record(event: string, ...args: unknown[]): void {
    this.events.push({ event, args });
  }

  postCreated(item: object): void {
    this.record('postCreated', item);
  }

  postLikes(postId: string, likeCount: number): void {
    this.record('postLikes', postId, likeCount);
  }

  postRemoved(postId: string): void {
    this.record('postRemoved', postId);
  }

  promptPublished(): void {
    this.record('promptPublished');
  }

  reportsChanged(): void {
    this.record('reportsChanged');
  }

  roleChanged(studentId: string, role: Role): void {
    this.record('roleChanged', studentId, role);
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

  matchChanged(studentIds: readonly string[]): void {
    this.record('matchChanged', studentIds);
  }

  friendsChanged(studentIds: readonly string[]): void {
    this.record('friendsChanged', studentIds);
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
