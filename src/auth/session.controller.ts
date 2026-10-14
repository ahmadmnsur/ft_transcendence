import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { clearSessionCookie, parseSessionCookie } from '../core/session-cookie';
import { SessionResolver } from '../core/session-resolver';
import { Public } from '../core/session.guard';

// `GET /api/session`, public (§6.1): `{ authenticated: false }`, or the
// student object with lazy renewal when signed in. An `s.` cookie that
// resolves to nothing is cleared; an `a.` cookie never is (§5.3).
@Controller()
export class SessionController {
  constructor(private readonly sessions: SessionResolver) {}

  @Public()
  @Get('session')
  async session(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    const parsed = parseSessionCookie(request.headers.cookie);
    if (parsed.kind !== 'session') return { authenticated: false };
    const session = await this.sessions.resolveActive(parsed.token);
    if (session === null) {
      response.setHeader('Set-Cookie', clearSessionCookie());
      return { authenticated: false };
    }
    await this.sessions.renewIfStale(session, parsed.token, response);
    return {
      authenticated: true,
      student: {
        id: session.studentId,
        displayName: session.displayName,
        email: session.email,
        role: session.role,
        avatarUrl: null,
      },
    };
  }
}
