import { Controller, Delete, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PageQueryDto } from '../core/paging';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import type { StudentRef } from '../students/student-ref';
import { FeedService } from './feed.service';
import type { LikeState, PostPage, PostView } from './views';

@Controller()
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get('feed')
  listFeed(@Query() query: PageQueryDto, @Req() request: Request): Promise<PostPage> {
    return this.feed.feed(requestActor(request), query.page, query.pageSize);
  }

  @Get('students/:id/posts')
  postsBy(@UuidParam('id') id: string, @Query() query: PageQueryDto, @Req() request: Request): Promise<PostPage> {
    return this.feed.postsBy(requestActor(request), id, query.page, query.pageSize);
  }

  @Get('posts/:id')
  getPost(@UuidParam('id') id: string, @Req() request: Request): Promise<PostView> {
    return this.feed.getPost(requestActor(request), id);
  }

  @Get('posts/:id/likes')
  likers(@UuidParam('id') id: string, @Req() request: Request): Promise<{ items: StudentRef[] }> {
    return this.feed.likers(requestActor(request), id);
  }

  @Post('posts/:id/like')
  @HttpCode(200)
  like(@UuidParam('id') id: string, @Req() request: Request): Promise<LikeState> {
    return this.feed.like(requestActor(request), id);
  }

  @Delete('posts/:id/like')
  unlike(@UuidParam('id') id: string, @Req() request: Request): Promise<LikeState> {
    return this.feed.unlike(requestActor(request), id);
  }
}
