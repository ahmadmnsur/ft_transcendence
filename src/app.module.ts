import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './core/core.module';
import { FeedModule } from './feed/feed.module';
import { FileCleanupSchedule } from './files/cleanup-schedule';
import { FilesModule } from './files/files.module';
import { HealthController } from './health.controller';
import { MatchingModule } from './matching/matching.module';
import { MessagingModule } from './messaging/messaging.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SocialModule } from './social/social.module';
import { StudentsModule } from './students/students.module';
import { PromptsModule } from './prompts/prompts.module';

// The schedule is provided here, not in FilesModule, so only the `api` runs
// the cleanup: the seed imports StudentsModule, and with it FilesModule.
@Module({
  imports: [
    CoreModule.forApp(), AuthModule, StudentsModule, SocialModule, FilesModule,
    MessagingModule, MatchingModule, PromptsModule, ReviewsModule, FeedModule,
  ],
  controllers: [HealthController],
  providers: [FileCleanupSchedule],
})
export class AppModule {}
