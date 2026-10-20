import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

// §3.4's `messaging` module: the `DirectMessage` rows. CoreModule is global,
// so the Unit of Work and the `RealtimePublisher` binding inject without an
// import; the socket gateway calls this module's `send` (§7.3) through the
// container, never the other way round.
@Module({
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
