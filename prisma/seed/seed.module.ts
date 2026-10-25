import { Module } from '@nestjs/common';
import { AdminModule } from '../../src/admin/admin.module';
import { AuthModule } from '../../src/auth/auth.module';
import { CoreModule } from '../../src/core/core.module';
import { FeedModule } from '../../src/feed/feed.module';
import { MatchingModule } from '../../src/matching/matching.module';
import { MessagingModule } from '../../src/messaging/messaging.module';
import { ModerationModule } from '../../src/moderation/moderation.module';
import { PromptsModule } from '../../src/prompts/prompts.module';
import { ReviewsModule } from '../../src/reviews/reviews.module';
import { SocialModule } from '../../src/social/social.module';
import { StudentsModule } from '../../src/students/students.module';

// The seed's application context (§14.1): the application's own modules,
// with CoreModule's no-op RealtimePublisher, so the seed publishes nothing.
// Each fixture slice imports the module whose services its steps call.
@Module({
  imports: [
    CoreModule,
    AuthModule,
    StudentsModule,
    SocialModule,
    MatchingModule,
    ReviewsModule,
    PromptsModule,
    FeedModule,
    MessagingModule,
    ModerationModule,
    AdminModule,
  ],
})
export class SeedModule {}
