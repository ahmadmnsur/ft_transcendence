import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { OpenedPageDto } from './dto';
import { NewDotsService, type NewDots } from './new-dots.service';

@Controller('me/new-dots')
export class NewDotsController {
  constructor(private readonly dots: NewDotsService) {}

  @Get()
  read(@Req() request: Request): Promise<NewDots> {
    return this.dots.read(requestActor(request));
  }

  @Post('opened')
  opened(@Body() input: OpenedPageDto, @Req() request: Request): Promise<NewDots> {
    return this.dots.opened(requestActor(request), input);
  }
}
