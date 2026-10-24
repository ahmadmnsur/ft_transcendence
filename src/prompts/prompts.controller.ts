import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { PageQueryDto } from '../core/paging';
import { AnswerPromptDto, PublishPromptDto } from './dto';
import { PromptsService } from './prompts.service';

@Controller()
export class PromptsController {
  constructor(private readonly prompts: PromptsService) {}

  @Post('prompts/:id/answers')
  answer(@UuidParam('id') id: string, @Body() body: AnswerPromptDto, @Req() request: Request) {
    return this.prompts.answer(requestActor(request), id, body.body);
  }

  @Get('prompts/:id/answers')
  answers(@UuidParam('id') id: string, @Query() query: PageQueryDto, @Req() request: Request) {
    return this.prompts.answers(requestActor(request), id, query.page, query.pageSize);
  }

  @Post('admin/prompts')
  publish(@Body() body: PublishPromptDto, @Req() request: Request) {
    return this.prompts.publish(requestActor(request), body.question);
  }

  @Get('prompts/live')
  live(@Req() request: Request) {
    return this.prompts.live(requestActor(request));
  }

  @Get(['prompts', 'admin/prompts'])
  history(@Query() query: PageQueryDto, @Req() request: Request) {
    return this.prompts.history(requestActor(request), query.page, query.pageSize);
  }
}
