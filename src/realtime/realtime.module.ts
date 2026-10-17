import { Module } from '@nestjs/common';
import { EmptyPresenceAudience, PresenceAudience } from './presence-audience';
import { PresenceRegistry } from './presence-registry';
import { RealtimeGateway } from './realtime.gateway';

// §3.4's `realtime` module: the Socket.IO gateway, the rooms and the
// Presence registry. Only `CoreModule.forApp` imports it — the seed's plain
// `CoreModule` keeps the no-op publisher (§3.7).
@Module({
  providers: [
    PresenceRegistry,
    RealtimeGateway,
    { provide: PresenceAudience, useClass: EmptyPresenceAudience },
  ],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
