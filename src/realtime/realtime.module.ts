import { Module } from '@nestjs/common';
import { FriendsPresenceAudience } from '../social/presence-audience';
import { PresenceAudience } from './presence-audience';
import { PresenceRegistry } from './presence-registry';
import { RealtimeGateway } from './realtime.gateway';

// §3.4's `realtime` module: the Socket.IO gateway, the rooms and the
// Presence registry. Only `CoreModule.forApp` imports it — the seed's plain
// `CoreModule` keeps the no-op publisher and the offline Presence reader
// (§3.7, §7.6).
@Module({
  providers: [
    PresenceRegistry,
    RealtimeGateway,
    { provide: PresenceAudience, useClass: FriendsPresenceAudience },
  ],
  exports: [RealtimeGateway, PresenceRegistry],
})
export class RealtimeModule {}
