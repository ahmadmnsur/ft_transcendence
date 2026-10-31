import { Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PageQueryDto } from '../core/paging';
import { requestActor, requestRole } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { FileReportDto, ResolvePostGroupDto, ResolveStudentGroupDto } from './dto';
import { ModerationService } from './moderation.service';
import type { ModerationQueue, ReportReceipt, Resolution, ResolvedPage } from './views';

@Controller()
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('reports')
  @HttpCode(200)
  file(@Body() input: FileReportDto, @Req() request: Request): Promise<ReportReceipt> {
    return this.moderation.file(requestActor(request), {
      target: input.postId !== undefined ? { postId: input.postId } : { studentId: input.studentId! },
      reason: input.reason,
      text: input.text,
    });
  }

  @Get('moderation/queue')
  queue(@Req() request: Request): Promise<ModerationQueue> {
    return this.moderation.queue(requestActor(request), requestRole(request));
  }

  @Post('moderation/post-groups/:postId/resolve')
  @HttpCode(200)
  resolvePostGroup(
    @UuidParam('postId') postId: string,
    @Body() dto: ResolvePostGroupDto,
    @Req() request: Request,
  ): Promise<Resolution> {
    return this.moderation.resolvePostGroup(requestActor(request), postId, dto.action);
  }

  @Post('moderation/student-groups/:studentId/resolve')
  @HttpCode(200)
  resolveStudentGroup(
    @UuidParam('studentId') studentId: string,
    @Body() dto: ResolveStudentGroupDto,
    @Req() request: Request,
  ): Promise<Resolution> {
    return this.moderation.resolveStudentGroup(requestActor(request), studentId, dto.action);
  }

  @Get('admin/reports/resolved')
  resolvedAudit(@Query() query: PageQueryDto, @Req() request: Request): Promise<ResolvedPage> {
    return this.moderation.resolvedAudit(requestActor(request), query.page, query.pageSize);
  }
}
