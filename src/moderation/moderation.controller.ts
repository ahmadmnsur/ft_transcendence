import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { FileReportDto } from './dto';
import { ModerationService } from './moderation.service';
import type { ReportReceipt } from './views';

// §3.4: controllers are thin — take the actor with `requestActor`, call ONE
// service method, and return its value. The global interceptor wraps it in
// the §3.8 envelope; the global SessionGuard requires a session, any role.
// A malformed id or bad body is `validation_failed` (§6.15).
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
}
