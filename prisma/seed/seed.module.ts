import { Module } from '@nestjs/common';
import { AuthModule } from '../../src/auth/auth.module';
import { CoreModule } from '../../src/core/core.module';
import { MatchingModule } from '../../src/matching/matching.module';
import { SocialModule } from '../../src/social/social.module';
import { StudentsModule } from '../../src/students/students.module';

// The seed's application context (§14.1): the application's own modules,
// with CoreModule's no-op RealtimePublisher, so the seed publishes nothing.
// Each fixture slice imports the module whose services its steps call.
@Module({ imports: [CoreModule, AuthModule, StudentsModule, SocialModule, MatchingModule] })
export class SeedModule {}
