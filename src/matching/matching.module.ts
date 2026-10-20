import { Module } from '@nestjs/common';
import { AdminRoundsController } from './admin-rounds.controller';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

// §3.4's `matching` module: the pure engine (`engine/`), `Round`, `Match` and
// `MatchSkillCoverage`. CoreModule is global, so the Unit of Work and the
// realtime port inject without an import.
@Module({
  controllers: [MatchingController, AdminRoundsController],
  providers: [MatchingService],
})
export class MatchingModule {}
