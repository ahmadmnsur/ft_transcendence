import { Body, Controller, Delete, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { BlockStudentDto, FriendRequestDto } from './dto';
import { SocialService } from './social.service';
import type { BlockView, FriendRequestLists, FriendRequestView, FriendView } from './views';

@Controller()
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get('friends')
  listFriends(@Req() request: Request): Promise<{ items: FriendView[] }> {
    return this.social.listFriends(requestActor(request));
  }

  @Get('friends/requests')
  listRequests(@Req() request: Request): Promise<FriendRequestLists> {
    return this.social.listRequests(requestActor(request));
  }

  @Post('friends/requests')
  @HttpCode(200)
  requestFriend(@Body() dto: FriendRequestDto, @Req() request: Request): Promise<FriendRequestView> {
    return this.social.requestFriend(requestActor(request), dto.studentId);
  }

  @Post('friends/requests/:id/accept')
  @HttpCode(200)
  acceptFriend(@UuidParam('id') id: string, @Req() request: Request): Promise<FriendView> {
    return this.social.acceptFriend(requestActor(request), id);
  }

  @Post('friends/requests/:id/decline')
  @HttpCode(200)
  declineFriend(@UuidParam('id') id: string, @Req() request: Request): Promise<Record<string, never>> {
    return this.social.declineFriend(requestActor(request), id);
  }

  @Delete('friends/requests/:id')
  cancelFriend(@UuidParam('id') id: string, @Req() request: Request): Promise<Record<string, never>> {
    return this.social.cancelFriend(requestActor(request), id);
  }

  @Delete('friends/:studentId')
  endFriendship(
    @UuidParam('studentId') studentId: string,
    @Req() request: Request,
  ): Promise<Record<string, never>> {
    return this.social.endFriendship(requestActor(request), studentId);
  }

  @Get('blocks')
  listBlocks(@Req() request: Request): Promise<{ items: BlockView[] }> {
    return this.social.listBlocks(requestActor(request));
  }

  @Post('blocks')
  @HttpCode(200)
  block(@Body() dto: BlockStudentDto, @Req() request: Request): Promise<BlockView> {
    return this.social.block(requestActor(request), dto.studentId);
  }

  @Delete('blocks/:studentId')
  unblock(@UuidParam('studentId') studentId: string, @Req() request: Request): Promise<Record<string, never>> {
    return this.social.unblock(requestActor(request), studentId);
  }
}
