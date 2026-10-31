import { Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { decodeCursor } from '../core/cursor';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { MessagesQueryDto } from './dto';
import { MessagingService } from './messaging.service';
import type { PeerThread, ThreadPage } from './views';

@Controller()
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('messages/threads')
  listThreads(@Query() query: MessagesQueryDto, @Req() request: Request): Promise<ThreadPage> {
    return this.messaging.listThreads(requestActor(request), decodeCursor(query.cursor));
  }

  @Get('messages/threads/:peerId')
  readThread(
    @UuidParam('peerId') peerId: string,
    @Query() query: MessagesQueryDto,
    @Req() request: Request,
  ): Promise<PeerThread> {
    return this.messaging.readThread(requestActor(request), peerId, decodeCursor(query.cursor));
  }

  @Post('messages/threads/:peerId/read')
  @HttpCode(200)
  markThreadRead(@UuidParam('peerId') peerId: string, @Req() request: Request): Promise<{ updated: number }> {
    return this.messaging.markThreadRead(requestActor(request), peerId);
  }
}
