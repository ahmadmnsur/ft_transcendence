import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { EvidenceMenteeGuard } from './evidence-mentee.guard';
import { EvidenceService } from './evidence.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

// §3.4's `reviews` module: `Review`, `PrivateFeedback` and `Evidence`.
// FilesModule gives the buckets.
@Module({
  imports: [FilesModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, EvidenceService, EvidenceMenteeGuard],
})
export class ReviewsModule {}
