import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

// §3.4's `social` module: `Friendship` and `Block`. CoreModule is global, so
// the Prisma client, the Unit of Work and the Presence reader inject without
// an import. The realtime module binds this module's Presence audience
// (`presence-audience.ts`) itself.
@Module({
  controllers: [SocialController],
  providers: [SocialService],
})
export class SocialModule {}
