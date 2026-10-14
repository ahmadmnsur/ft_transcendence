import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { parseSessionCookie } from '../core/session-cookie';
import { Public } from '../core/session.guard';
import { AuthService } from './auth.service';

// `GET /api/session`, public (§6.1). The controller parses the cookie and
// passes the parsed value; the service resolves the actor and answers (§3.4).
@Controller()
export class SessionController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get('session')
  async session(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    return this.auth.resolveSession(parseSessionCookie(request.headers.cookie), response);
  }
}
