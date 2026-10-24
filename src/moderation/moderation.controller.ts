import { Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PageQueryDto } from '../core/paging';
import { requestActor, requestRole } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { FileReportDto, ResolvePostGroupDto, ResolveStudentGroupDto } from './dto';
import { ModerationService } from './moderation.service';
import type { ModerationQueue, ReportReceipt, Resolution, ResolvedPage } from './views';

// §3.4: controllers are thin — take the actor with `requestActor`, call ONE
// service method, and return its value. The global interceptor wraps it in
// the §3.8 envelope; the global SessionGuard requires a session, any role,
// and the RolesGuard admits only a Peer Moderator or an Admin to
// `/api/moderation/*` and only an Admin to `/api/admin/*` (§5.3). A
// malformed id or bad body is `validation_failed` (§6.15).
@Controller()
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  // `POST /api/reports` (§12.2): an honest receipt, with no outcome disclosure.
  @Post('reports')
  @HttpCode(200)
  file(@Body() input: FileReportDto, @Req() request: Request): Promise<ReportReceipt> {
    // §12.2: the DTO validator guarantees exactly one non-null target id.
    return this.moderation.file(requestActor(request), {
      target: input.postId !== undefined ? { postId: input.postId } : { studentId: input.studentId! },
      reason: input.reason,
      text: input.text,
    });
  }

  // `GET /api/moderation/queue` (§12.4): what it shows follows the role the
  // session guard read for this request.
  @Get('moderation/queue')
  queue(@Req() request: Request): Promise<ModerationQueue> {
    return this.moderation.queue(requestActor(request), requestRole(request));
  }

  // `POST /api/moderation/post-groups/:postId/resolve` (§12.5). 200: it
  // creates nothing (§3.8.2).
  @Post('moderation/post-groups/:postId/resolve')
  @HttpCode(200)
  resolvePostGroup(
    @UuidParam('postId') postId: string,
    @Body() dto: ResolvePostGroupDto,
    @Req() request: Request,
  ): Promise<Resolution> {
    return this.moderation.resolvePostGroup(requestActor(request), postId, dto.action);
  }

  // `POST /api/moderation/student-groups/:studentId/resolve` (§12.5): the
  // role guard lets a Peer Moderator through, and the service answers them
  // 403.
  @Post('moderation/student-groups/:studentId/resolve')
  @HttpCode(200)
  resolveStudentGroup(
    @UuidParam('studentId') studentId: string,
    @Body() dto: ResolveStudentGroupDto,
    @Req() request: Request,
  ): Promise<Resolution> {
    return this.moderation.resolveStudentGroup(requestActor(request), studentId, dto.action);
  }

  // `GET /api/admin/reports/resolved?page&pageSize` (§12.6, §6.0.1).
  @Get('admin/reports/resolved')
  resolvedAudit(@Query() query: PageQueryDto, @Req() request: Request): Promise<ResolvedPage> {
    return this.moderation.resolvedAudit(requestActor(request), query.page, query.pageSize);
  }
}
