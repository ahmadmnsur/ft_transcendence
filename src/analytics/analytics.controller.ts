import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type { AnalyticsView } from './views';

// The global SessionGuard and RolesGuard require an active Admin here (§5.3).
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  snapshot(): Promise<AnalyticsView> {
    return this.analytics.snapshot();
  }
}
