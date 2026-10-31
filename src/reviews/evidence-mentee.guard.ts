import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ApiError } from '../core/errors';
import { PrismaService } from '../core/prisma.service';
import { requestActor } from '../core/session.guard';
import { isUuid } from '../shared/uuid';
import { reviewMenteeId } from './review-mentee';

@Injectable()
export class EvidenceMenteeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const reviewId = request.params['reviewId'];
    if (typeof reviewId !== 'string' || !isUuid(reviewId)) throw new ApiError('validation_failed');
    if ((await reviewMenteeId(this.prisma, reviewId)) !== requestActor(request).studentId) {
      throw new ApiError('forbidden');
    }
    return true;
  }
}
