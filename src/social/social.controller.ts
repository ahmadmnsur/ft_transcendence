import { Body, Controller, Delete, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { BlockStudentDto, FriendRequestDto } from './dto';
import { SocialService } from './social.service';
import type { BlockView, FriendRequestLists, FriendRequestView, FriendView } from './views';

// §3.4: controllers are thin — parse, validate the DTO, take the actor with
// `requestActor`, call ONE service method, and return its value. The global
// interceptor wraps it in the §3.8 envelope. Every route needs a session: the
// global SessionGuard already enforces it, so none is marked `@Public` (§5.3).
@Controller()
export class SocialController {
  constructor(private readonly social: SocialService) {}

  // `GET /api/friends` (§6.4): the actor's accepted Friends, with `online`.
  @Get('friends')
  listFriends(@Req() request: Request): Promise<{ items: FriendView[] }> {
    return this.social.listFriends(requestActor(request));
  }

  // `GET /api/friends/requests` (§6.4): `{ incoming, outgoing }`, pending.
  @Get('friends/requests')
  listRequests(@Req() request: Request): Promise<FriendRequestLists> {
    return this.social.listRequests(requestActor(request));
  }

  // `POST /api/friends/requests` (§6.4): the new outgoing request.
  @Post('friends/requests')
  @HttpCode(200)
  requestFriend(@Body() dto: FriendRequestDto, @Req() request: Request): Promise<FriendRequestView> {
    return this.social.requestFriend(requestActor(request), dto.studentId);
  }

  // `POST /api/friends/requests/:id/accept` (§6.4): the new Friend.
  @Post('friends/requests/:id/accept')
  @HttpCode(200)
  acceptFriend(@UuidParam('id') id: string, @Req() request: Request): Promise<FriendView> {
    return this.social.acceptFriend(requestActor(request), id);
  }

  // `POST /api/friends/requests/:id/decline` (§6.4): `{}` → `{}`.
  @Post('friends/requests/:id/decline')
  @HttpCode(200)
  declineFriend(@UuidParam('id') id: string, @Req() request: Request): Promise<Record<string, never>> {
    return this.social.declineFriend(requestActor(request), id);
  }

  // `DELETE /api/friends/requests/:id` (§6.4): the requester cancels.
  @Delete('friends/requests/:id')
  cancelFriend(@UuidParam('id') id: string, @Req() request: Request): Promise<Record<string, never>> {
    return this.social.cancelFriend(requestActor(request), id);
  }

  // `DELETE /api/friends/:studentId` (§6.4): either party ends the
  // Friendship; `not_friends` when there is none.
  @Delete('friends/:studentId')
  endFriendship(
    @UuidParam('studentId') studentId: string,
    @Req() request: Request,
  ): Promise<Record<string, never>> {
    return this.social.endFriendship(requestActor(request), studentId);
  }

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
