import {
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Post,
  Redirect,
  Req,
  Res,
  UseGuards,
  type CanActivate,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppConfig } from '../core/app-config';
import { ApiError } from '../core/errors';
import { clearAttemptCookie, parseSessionCookie, serializeAttemptCookie } from '../core/session-cookie';
import { Public } from '../core/session.guard';
import { Start42Dto } from './dto';
import { FortyTwoService } from './forty-two.service';
import { ATTEMPT_TTL_SECONDS } from './oauth-attempt-store';

// §5.6 A: while either `FT_OAUTH_*` value is empty, every `/api/auth/42/*`
// route answers 404 `not_found` — before any session or attempt lookup, any
// external call, any cookie change and any redirect. The guard sits on the
// controller, so it runs after the global guards: a request already refused
// for its own reason (a non-JSON mutation is 415) keeps that reason.
@Injectable()
export class FortyTwoEnabledGuard implements CanActivate {
  constructor(private readonly config: AppConfig) {}

  canActivate(): boolean {
    if (this.config.oauth42Enabled) return true;
    throw new ApiError('not_found');
  }
}

@UseGuards(FortyTwoEnabledGuard)
@Controller('auth/42')
export class FortyTwoController {
  constructor(private readonly fortyTwo: FortyTwoService) {}

  // `POST /api/auth/42/start` (§5.6 A step 1, §6.1): a JSON mutation. The
  // service mints the attempt under the cookie's binding; this boundary
  // answers the SPA's next navigation.
  @Public()
  @Post('start')
  @HttpCode(200)
  async start(
    @Body() dto: Start42Dto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    const started = await this.fortyTwo.start42({
      intent: dto.intent,
      cookie: parseSessionCookie(request.headers.cookie),
    });
    response.setHeader('Set-Cookie', serializeAttemptCookie(started.attemptToken, ATTEMPT_TTL_SECONDS));
    return { authorizeUrl: started.authorizeUrl };
  }

  // `GET /api/auth/42/callback?code=…&state=…` (§5.6 A). The envelope skips a
  // `@Redirect()` handler, so `Cache-Control: no-store` is set here, beside
  // the clearing cookie when the request carried an `a.` one. The query is
  // read as optional strings and never logged.
  @Public()
  @Get('callback')
  @Redirect()
  async callback(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ url: string; statusCode: number }> {
    const query = request.query;
    const outcome = await this.fortyTwo.complete42({
      cookie: parseSessionCookie(request.headers.cookie),
      // `code` and `state` must be single strings; `error` is presence
      // alone, so a duplicate, empty or malformed one still rejects at
      // step 5. No query value is ever read into a log.
      query: {
        code: typeof query.code === 'string' ? query.code : undefined,
        state: typeof query.state === 'string' ? query.state : undefined,
        errorPresent: Object.hasOwn(query, 'error'),
      },
    });
    response.setHeader('Cache-Control', 'no-store');
    if (outcome.clearAttemptCookie) response.setHeader('Set-Cookie', clearAttemptCookie());
    return { url: outcome.location, statusCode: 302 };
  }
}
