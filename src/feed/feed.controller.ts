import { Controller, Delete, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PageQueryDto } from '../core/paging';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import type { StudentRef } from '../students/student-ref';
import { FeedService } from './feed.service';
import type { LikeState, PostPage, PostView } from './views';

// §3.4: controllers are thin — read `?page&pageSize`, take the actor with
// `requestActor`, call ONE service method, and return its value. The global
// interceptor wraps it in the §3.8 envelope. Every route needs a session: the
// global SessionGuard already enforces it, so none is marked `@Public` (§5.3).
// A malformed id is 400 (`UuidParam`).
@Controller()
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  // `GET /api/feed` (§6.9): non-removed Posts, newest first, one numbered
  // page (§6.0.1).
  @Get('feed')
  listFeed(@Query() query: PageQueryDto, @Req() request: Request): Promise<PostPage> {
    return this.feed.feed(requestActor(request), query.page, query.pageSize);
  }

  // `GET /api/students/:id/posts` (§6.2): that Student's non-removed Posts.
  @Get('students/:id/posts')
  postsBy(@UuidParam('id') id: string, @Query() query: PageQueryDto, @Req() request: Request): Promise<PostPage> {
    return this.feed.postsBy(requestActor(request), id, query.page, query.pageSize);
  }

  // `GET /api/posts/:id` (§6.9).
  @Get('posts/:id')
  getPost(@UuidParam('id') id: string, @Req() request: Request): Promise<PostView> {
    return this.feed.getPost(requestActor(request), id);
  }

  // `GET /api/posts/:id/likes` (§6.9): the likers' StudentRefs.
  @Get('posts/:id/likes')
  likers(@UuidParam('id') id: string, @Req() request: Request): Promise<{ items: StudentRef[] }> {
    return this.feed.likers(requestActor(request), id);
  }

  // `POST /api/posts/:id/like` (§6.9): `{}` → `{ likeCount, likedByMe: true }`.
  @Post('posts/:id/like')
  @HttpCode(200)
  like(@UuidParam('id') id: string, @Req() request: Request): Promise<LikeState> {
    return this.feed.like(requestActor(request), id);
  }

  // `DELETE /api/posts/:id/like` (§6.9): `{}` → `{ likeCount, likedByMe: false }`.
  @Delete('posts/:id/like')
  unlike(@UuidParam('id') id: string, @Req() request: Request): Promise<LikeState> {
    return this.feed.unlike(requestActor(request), id);
  }
}
