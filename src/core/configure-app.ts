import type { INestApplication } from '@nestjs/common';
import { PeerConnectIoAdapter } from '../realtime/socket-io.adapter';
import { AppConfig } from './app-config';
import { AppLogger } from './logger';

export const API_PREFIX = 'api';

// The app-level settings no module can carry. Anything that boots AppModule
// applies them: main.ts, and the test harness.
export function configureApp(app: INestApplication): void {
  app.useLogger(app.get(AppLogger));
  app.setGlobalPrefix(API_PREFIX);
  // The socket endpoint: WebSocket only, gated on PUBLIC_ORIGIN (§7.1,
  // §7.2). Installed here so main.ts and the test harness both run the real
  // adapter; CORS stays off (§5.4): nothing calls enableCors.
  app.useWebSocketAdapter(new PeerConnectIoAdapter(app, app.get(AppConfig).publicOrigin));
}
