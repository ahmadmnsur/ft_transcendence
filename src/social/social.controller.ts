import { Body, Controller, Delete, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { BlockStudentDto } from './dto';
import { SocialService } from './social.service';
import type { BlockView } from './views';

// §3.4: controllers are thin — parse, validate the DTO, take the actor with
// `requestActor`, call ONE service method, and return its value. The global
// interceptor wraps it in the §3.8 envelope. Every route needs a session: the
// global SessionGuard already enforces it, so none is marked `@Public` (§5.3).
@Controller()
export class SocialController {
  constructor(private readonly social: SocialService) {}

  // `GET /api/blocks` (§6.4): the actor's own Blocks.
  @Get('blocks')
  listBlocks(@Req() request: Request): Promise<{ items: BlockView[] }> {
    return this.social.listBlocks(requestActor(request));
  }

  // `POST /api/blocks` (§6.4): the new Block.
  @Post('blocks')
  @HttpCode(200)
  block(@Body() dto: BlockStudentDto, @Req() request: Request): Promise<BlockView> {
    return this.social.block(requestActor(request), dto.studentId);
  }

  // `DELETE /api/blocks/:studentId` (§6.4). A malformed id is 400
  // (`UuidParam`); an id the actor has not blocked is `not_blocked`.
  @Delete('blocks/:studentId')
  unblock(@UuidParam('studentId') studentId: string, @Req() request: Request): Promise<Record<string, never>> {
    return this.social.unblock(requestActor(request), studentId);
  }
}
