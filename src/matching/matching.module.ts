import { Module } from '@nestjs/common';
import { AdminRoundsController } from './admin-rounds.controller';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

@Module({
  controllers: [MatchingController, AdminRoundsController],
  providers: [MatchingService],
})
export class MatchingModule {}
