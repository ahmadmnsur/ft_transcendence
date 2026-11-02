import { Injectable } from '@nestjs/common';

export type RevokeTarget = { studentId: string } | { sessionHash: string };

export abstract class RealtimePublisher {
  abstract postCreated(item: object): void;

  abstract postLikes(authorId: string, postId: string, likeCount: number): void;

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
  roundOpened(): void {}
  roundClosed(): void {}
  matchReady(): void {}
  matchChanged(): void {}
  friendsChanged(): void {}
  dmMessage(): void {}
  presenceUpdate(): void {}
  revokeSessions(): void {}
}
