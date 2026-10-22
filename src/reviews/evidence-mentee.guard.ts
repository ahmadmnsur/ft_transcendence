import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ApiError } from '../core/errors';
import { PrismaService } from '../core/prisma.service';
import { requestActor } from '../core/session.guard';
import { isUuid } from '../shared/uuid';
import { reviewMenteeId } from './review-mentee';

// §9.4's pre-check, on both Evidence routes: the actor is the Mentee of this
// Review's Match, else 403. A route guard runs after the global ones, the
// upload gate and the session, and before any interceptor, so a refused PUT
// is refused before Multer reads a byte (§5.4). Pipes run after it, so it
// answers a malformed id itself, as `UuidParam` would. An unknown Review has
// no Mentee, so it is 403 too. The transaction checks again.
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
