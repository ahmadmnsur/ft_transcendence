import { Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { MatchHistoryQueryDto } from './dto';
import { MatchingService } from './matching.service';
import type { CurrentMatch, CurrentRound, MatchHistoryPage, MatchView, MatchDetailView } from './views';

// §6.6: the Student side of Rounds and Matches. §3.4: controllers are thin —
// take the actor with `requestActor`, call ONE service method, and return its
// value; the global interceptor wraps it in the §3.8 envelope. Every route
// needs a session, which the global SessionGuard enforces (§5.3).
@Controller()
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  // `GET /api/rounds/current`: `{ round: { id, number, openedAt } | null }`.
  @Get('rounds/current')
  currentRound(@Req() request: Request): Promise<CurrentRound> {
    return this.matching.currentRound(requestActor(request));
  }

  // `GET /api/matches/current`: `{ match: MatchView | null }`. Declared before
  // `matches/:id`, so `current` is never read as an id.
  @Get('matches/current')
  currentMatch(@Req() request: Request): Promise<CurrentMatch> {
    return this.matching.currentMatch(requestActor(request));
  }

  // `GET /api/matches?page&pageSize`: the actor's own Matches, every status.
  @Get('matches')
  history(@Query() query: MatchHistoryQueryDto, @Req() request: Request): Promise<MatchHistoryPage> {
    return this.matching.history(requestActor(request), query.page, query.pageSize);
  }

  // `GET /api/matches/:id`: the pair only; anyone else gets 404.
  @Get('matches/:id')
  getMatch(@UuidParam('id') id: string, @Req() request: Request): Promise<MatchDetailView> {
    return this.matching.getMatch(requestActor(request), id);
  }

  // `POST /api/matches/:id/accept` (§8.5): `{}` → the Match as it now stands.
  @Post('matches/:id/accept')
  @HttpCode(200)
  accept(@UuidParam('id') id: string, @Req() request: Request): Promise<MatchView> {
    return this.matching.accept(requestActor(request), id);
  }

  // `POST /api/matches/:id/decline` (§8.5): `{}` → the Match, now DECLINED.
  @Post('matches/:id/decline')
  @HttpCode(200)
  decline(@UuidParam('id') id: string, @Req() request: Request): Promise<MatchView> {
    return this.matching.decline(requestActor(request), id);
  }
}
