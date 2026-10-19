import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

// §3.4's `social` module: `Block` now, `Friendship` with #46. CoreModule is
// global, so the Prisma client and the Unit of Work inject without an import.
@Module({
  controllers: [SocialController],
  providers: [SocialService],
})
export class SocialModule {}
