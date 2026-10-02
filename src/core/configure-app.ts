import type { INestApplication } from '@nestjs/common';
import { AppLogger } from './logger';

export const API_PREFIX = 'api';

// The app-level settings no module can carry. Anything that boots AppModule
// applies them: main.ts, and the test harness.
export function configureApp(app: INestApplication): void {
  app.useLogger(app.get(AppLogger));
  app.setGlobalPrefix(API_PREFIX);
  // CORS stays off (§5.4): nothing calls enableCors.
}
