import { Injectable } from '@nestjs/common';
import type { Role } from '../shared/roles';

export type RevokeTarget = { studentId: string } | { sessionHash: string };

export abstract class RealtimePublisher {
  abstract postCreated(item: object): void;

  abstract postLikes(postId: string, likeCount: number): void;

  abstract postRemoved(postId: string): void;

  abstract promptPublished(): void;

  abstract reportsChanged(): void;

  abstract roleChanged(studentId: string, role: Role): void;

  abstract roundOpened(): void;

  abstract roundClosed(): void;

  abstract matchReady(studentIds: readonly string[]): void;

  abstract matchChanged(studentIds: readonly string[]): void;

  abstract friendsChanged(studentIds: readonly string[]): void;

  abstract dmMessage(senderId: string, recipientId: string, message: object): void;

  abstract presenceUpdate(friendIds: readonly string[], studentId: string, online: boolean): void;

  abstract revokeSessions(target: RevokeTarget): void;
}

@Injectable()
export class NoopRealtimePublisher extends RealtimePublisher {
  postCreated(): void {}
  postLikes(): void {}
  postRemoved(): void {}
  promptPublished(): void {}
  reportsChanged(): void {}
  roleChanged(): void {}
  roundOpened(): void {}
  roundClosed(): void {}
  matchReady(): void {}
  matchChanged(): void {}
  friendsChanged(): void {}
  dmMessage(): void {}
  presenceUpdate(): void {}
  revokeSessions(): void {}
}
