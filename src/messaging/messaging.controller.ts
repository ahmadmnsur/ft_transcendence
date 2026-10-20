import { Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { decodeCursor } from '../core/cursor';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { MessagingService } from './messaging.service';
import type { PeerThread, ThreadPage } from './views';

// §3.4: controllers are thin — decode `?cursor`, take the actor with
// `requestActor`, call ONE service method, and return its value. The global
// interceptor wraps it in the §3.8 envelope. Every route needs a session: the
// global SessionGuard already enforces it, so none is marked `@Public` (§5.3).
@Controller()
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  // `GET /api/messages/threads` (§6.5): one row per peer, newest activity
  // first, 50 per page.
  @Get('messages/threads')
  listThreads(@Req() request: Request): Promise<ThreadPage> {
    return this.messaging.listThreads(requestActor(request), decodeCursor(request.query.cursor));
  }

  // `GET /api/messages/threads/:peerId` (§6.5): the page of the pair's two
  // directions, newest first. A malformed id is 400 (`UuidParam`); an unknown
  // peer, or the actor's own id, is 404.
  @Get('messages/threads/:peerId')
  readThread(@UuidParam('peerId') peerId: string, @Req() request: Request): Promise<PeerThread> {
    return this.messaging.readThread(requestActor(request), peerId, decodeCursor(request.query.cursor));
  }

  // `POST /api/messages/threads/:peerId/read` (§6.5): `{}` in, `{ updated }`
  // out. No event follows it: there is no read receipt (§7.4, §11.4).
  @Post('messages/threads/:peerId/read')
  @HttpCode(200)
  markThreadRead(@UuidParam('peerId') peerId: string, @Req() request: Request): Promise<{ updated: number }> {
    return this.messaging.markThreadRead(requestActor(request), peerId);
  }
}
