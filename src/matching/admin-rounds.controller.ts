import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { HandMadeMatchDto } from './dto';
import { MatchingService } from './matching.service';
import type {
  AdminMatchView,
  AdminMatchDetailView,
  AdminRoundDetail,
  AdminRoundSummary,
  CloseRoundResult,
  OpenRoundResult,
} from './views';

@Controller('admin')
export class AdminRoundsController {
  constructor(private readonly matching: MatchingService) {}

  @Post('rounds/current/matches')
  createHandMadeMatch(@Body() body: HandMadeMatchDto, @Req() request: Request): Promise<AdminMatchView> {
    return this.matching.createHandMadeMatch(requestActor(request), body.studentIds);
  }

  @Get('rounds')
  listRounds(@Req() request: Request): Promise<{ items: AdminRoundSummary[] }> {
    return this.matching.listRounds(requestActor(request));
  }

  @Post('rounds')
  openRound(@Req() request: Request): Promise<OpenRoundResult> {
    return this.matching.openRound(requestActor(request));
  }

  @Post('rounds/current/close')
  @HttpCode(200)
  closeRound(@Req() request: Request): Promise<CloseRoundResult> {
    return this.matching.closeRound(requestActor(request));
  }

  @Get('rounds/:id')
  getRound(@UuidParam('id') id: string, @Req() request: Request): Promise<AdminRoundDetail> {
    return this.matching.getRound(requestActor(request), id);
  }

  @Get('matches/:id')
  getMatch(@UuidParam('id') id: string, @Req() request: Request): Promise<AdminMatchDetailView> {
    return this.matching.getAdminMatch(requestActor(request), id);
  }
}
