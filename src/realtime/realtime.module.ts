import { Module } from '@nestjs/common';
import { FriendsPresenceAudience } from '../social/presence-audience';
import { PresenceAudience } from './presence-audience';
import { PresenceRegistry } from './presence-registry';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  providers: [
    PresenceRegistry,
    RealtimeGateway,
    { provide: PresenceAudience, useClass: FriendsPresenceAudience },
  ],
  exports: [RealtimeGateway, PresenceRegistry],
})
export class RealtimeModule {}
