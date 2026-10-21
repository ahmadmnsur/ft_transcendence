import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { FileUpload } from '../files/upload.interceptor';
import type { UploadedPart } from '../files/validate';
import { MatchHistoryQueryDto } from '../matching/dto';
import { LIMITS } from '../shared/limits';
import { SubmitReviewDto } from './dto';
import { EvidenceMenteeGuard } from './evidence-mentee.guard';
import { EvidenceService } from './evidence.service';
import { ReviewsService } from './reviews.service';
import type { EvidenceView, FeedbackPage, SubmitReviewResult } from './views';

@Controller()
export class ReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly evidence: EvidenceService,
  ) {}

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

  // `PUT /api/reviews/:reviewId/evidence` (§9.4): multipart field `file`.
  // UploadCsrfGuard, the session guard and the Mentee pre-check run before
  // FileUpload's Multer reads the body.
  @Put('reviews/:reviewId/evidence')
  @UseGuards(EvidenceMenteeGuard)
  @UseInterceptors(FileUpload(LIMITS.evidence.maxBytes))
  putEvidence(
    @UuidParam('reviewId') reviewId: string,
    @UploadedFile() file: UploadedPart | undefined,
    @Req() request: Request,
  ): Promise<EvidenceView> {
    return this.evidence.putEvidence(requestActor(request), reviewId, file);
  }

  // `DELETE /api/reviews/:reviewId/evidence` (§9.4): `{}`, idempotent.
  @Delete('reviews/:reviewId/evidence')
  @UseGuards(EvidenceMenteeGuard)
  deleteEvidence(
    @UuidParam('reviewId') reviewId: string,
    @Req() request: Request,
  ): Promise<Record<string, never>> {
    return this.evidence.deleteEvidence(requestActor(request), reviewId);
  }
}
