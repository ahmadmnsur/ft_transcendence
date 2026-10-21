import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { MatchHistoryQueryDto } from '../matching/dto';
import { SubmitReviewDto } from './dto';
import { ReviewsService } from './reviews.service';
import type { FeedbackPage, SubmitReviewResult } from './views';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('matches/:id/review')
  submit(
    @UuidParam('id') id: string,
    @Body() input: SubmitReviewDto,
    @Req() request: Request,
  ): Promise<SubmitReviewResult> {
    return this.reviews.submitReview(requestActor(request), id, input);
  }

  @Get('me/feedback-received')
  received(@Query() query: MatchHistoryQueryDto, @Req() request: Request): Promise<FeedbackPage> {
    return this.reviews.listFeedbackReceived(requestActor(request), query.page, query.pageSize);
  }
}
