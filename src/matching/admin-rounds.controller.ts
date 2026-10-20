import { Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { MatchingService } from './matching.service';
import type {
  AdminMatchView,
  AdminRoundDetail,
  AdminRoundSummary,
  CloseRoundResult,
  OpenRoundResult,
} from './views';

// §6.13: Rounds and Matches for Admins. The global RolesGuard answers 403 to
// anyone but an Admin on `/api/admin/*` (§5.3); the two writes re-read the
// actor's role and flags inside their transaction all the same (§3.4).
@Controller('admin')
export class AdminRoundsController {
  constructor(private readonly matching: MatchingService) {}

  // `GET /api/admin/rounds`: every Round, newest first.
  @Get('rounds')
  listRounds(@Req() request: Request): Promise<{ items: AdminRoundSummary[] }> {
    return this.matching.listRounds(requestActor(request));
  }

  // `POST /api/admin/rounds` (§8.4): `{}` → the new Round, how many Matches it
  // made and who is left unmatched. 201: it creates the Round (§3.8.2).
  @Post('rounds')
  openRound(@Req() request: Request): Promise<OpenRoundResult> {
    return this.matching.openRound(requestActor(request));
  }

  // `POST /api/admin/rounds/current/close` (§8.7): `{}` → `{ roundId, lapsed }`.
  @Post('rounds/current/close')
  @HttpCode(200)
  closeRound(@Req() request: Request): Promise<CloseRoundResult> {
    return this.matching.closeRound(requestActor(request));
  }

  // `GET /api/admin/rounds/:id`: its Matches, and its unmatched while open.
  @Get('rounds/:id')
  getRound(@UuidParam('id') id: string, @Req() request: Request): Promise<AdminRoundDetail> {
    return this.matching.getRound(requestActor(request), id);
  }

  // `GET /api/admin/matches/:id`: any Match as `AdminMatchView`.
  @Get('matches/:id')
  getMatch(@UuidParam('id') id: string, @Req() request: Request): Promise<AdminMatchView> {
    return this.matching.getAdminMatch(requestActor(request), id);
  }
}
