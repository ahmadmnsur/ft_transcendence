import { Module } from '@nestjs/common';
import { CoreModule } from '../../src/core/core.module';

// The seed's application context (§14.1): the application's own modules,
// with CoreModule's no-op RealtimePublisher, so the seed publishes nothing.
// Each fixture slice imports the module whose services its steps call.
@Module({ imports: [CoreModule] })
export class SeedModule {}
