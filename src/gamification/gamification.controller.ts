import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { GamificationService } from './gamification.service';

@Controller()
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get('me/progress')
  progress(@Req() request: Request) {
    return this.gamification.progress(requestActor(request));
  }
}
