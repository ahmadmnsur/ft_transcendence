import { Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { MatchHistoryQueryDto } from './dto';
import { MatchingService } from './matching.service';
import type { CurrentMatch, CurrentRound, MatchHistoryPage, MatchDetailView } from './views';

@Controller()
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get('rounds/current')
  currentRound(@Req() request: Request): Promise<CurrentRound> {
    return this.matching.currentRound(requestActor(request));
  }

  @Get('matches/current')
  currentMatch(@Req() request: Request): Promise<CurrentMatch> {
    return this.matching.currentMatch(requestActor(request));
  }

  @Get('matches')
  history(@Query() query: MatchHistoryQueryDto, @Req() request: Request): Promise<MatchHistoryPage> {
    return this.matching.history(requestActor(request), query.page, query.pageSize);
  }

  @Get('matches/:id')
  getMatch(@UuidParam('id') id: string, @Req() request: Request): Promise<MatchDetailView> {
    return this.matching.getMatch(requestActor(request), id);
  }

  @Post('matches/:id/accept')
  @HttpCode(200)
  accept(@UuidParam('id') id: string, @Req() request: Request): Promise<MatchDetailView> {
    return this.matching.accept(requestActor(request), id);
  }

  @Post('matches/:id/decline')
  @HttpCode(200)
  decline(@UuidParam('id') id: string, @Req() request: Request): Promise<MatchDetailView> {
    return this.matching.decline(requestActor(request), id);
  }
}
