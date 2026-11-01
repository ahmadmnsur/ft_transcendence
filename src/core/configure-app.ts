import type { INestApplication } from '@nestjs/common';
import { PeerConnectIoAdapter } from '../realtime/socket-io.adapter';
import { AppConfig } from './app-config';
import { AppLogger } from './logger';

export const API_PREFIX = 'api';

export function configureApp(app: INestApplication): void {
  app.useLogger(app.get(AppLogger));
  app.setGlobalPrefix(API_PREFIX);
  app.useWebSocketAdapter(new PeerConnectIoAdapter(app, app.get(AppConfig).publicOrigin));
}
