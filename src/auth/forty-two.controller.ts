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
import { ApiError, CountedRefusal } from '../core/errors';
import {
  clearAttemptCookie,
  clearSessionCookie,
  parseSessionCookie,
  serializeAttemptCookie,
  serializeSessionCookie,
} from '../core/session-cookie';
import { SessionResolver } from '../core/session-resolver';
import { requestActor, Public, authenticateSession } from '../core/session.guard';
import { ThrottleStore, type ThrottleSlot } from '../core/throttle';
import { Disconnect42Dto, Password42Dto, Start42Dto, SignupDto } from './dto';
import { FortyTwoService, type ThrottledPasswordCheck } from './forty-two.service';
import { ATTEMPT_TTL_SECONDS } from './oauth-attempt-store';
import { signedOutBy } from './password-change';
import { oauthFailed, tooManyAttempts } from './refusals';

@Injectable()
export class FortyTwoEnabledGuard implements CanActivate {
  constructor(private readonly config: AppConfig) {}

  canActivate(): boolean {
    if (this.config.oauth42Enabled) return true;
    throw new ApiError('not_found');
  }
}

@Controller('auth/42')
@UseGuards(FortyTwoEnabledGuard)
export class FortyTwoController {
  constructor(
    private readonly fortyTwo: FortyTwoService,
    private readonly throttle: ThrottleStore,
    private readonly sessions: SessionResolver,
  ) {}

  private key(request: Request, normalisedEmail: string): string {
    return ThrottleStore.key(ThrottleStore.clientAddress(request.headers['x-real-ip']), normalisedEmail);
  }

  private reserveOrRefuse(request: Request, normalisedEmail: string): ThrottleSlot {
    const slot = this.throttle.reserve(this.key(request, normalisedEmail));
    if (slot === null) throw tooManyAttempts();
    return slot;
  }

  private settleWhenCounted(slot: ThrottleSlot, err: unknown): void {
    if (err instanceof CountedRefusal) this.throttle.settleCounted(slot);
  }

  private throttledCheck(request: Request): ThrottledPasswordCheck {
    return async (email, check) => {
      const slot = this.reserveOrRefuse(request, email);
      try {
        await check();
      } catch (err) {
        this.settleWhenCounted(slot, err);
        throw err;
      } finally {
        this.throttle.release(slot);
      }
    };
  }

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
      password: dto.password,
      cookie: parseSessionCookie(request.headers.cookie),
      throttledCheck: this.throttledCheck(request),
    });
    if (started.attemptToken !== null) {
      response.setHeader(
        'Set-Cookie',
        serializeAttemptCookie(started.attemptToken, ATTEMPT_TTL_SECONDS),
      );
    }
    return { authorizeUrl: started.authorizeUrl };
  }

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
      query: {
        code: typeof query.code === 'string' ? query.code : undefined,
        state: typeof query.state === 'string' ? query.state : undefined,
        errorPresent: Object.hasOwn(query, 'error'),
      },
    });
    response.setHeader('Cache-Control', 'no-store');
    if (outcome.clearAttemptCookie) response.setHeader('Set-Cookie', clearAttemptCookie());
    if (outcome.sessionCookie !== undefined) {
      response.setHeader(
        'Set-Cookie',
        serializeSessionCookie(outcome.sessionCookie.token, outcome.sessionCookie.maxAge),
      );
    }
    return { url: outcome.location, statusCode: 302 };
  }

  @Public()
  @Get('draft')
  async draft(@Req() request: Request): Promise<{ login: string; email: string }> {
    return this.fortyTwo.signUpDraft(parseSessionCookie(request.headers.cookie));
  }

  @Public()
  @Post('signup')
  async signUp(
    @Body() dto: SignupDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    const cookie = parseSessionCookie(request.headers.cookie);
    if (cookie.kind !== 'attempt') throw oauthFailed();
    const created = await this.fortyTwo.signUp42({
      attemptToken: cookie.token,
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      countAttempt: (email) => {
        const slot = this.reserveOrRefuse(request, email);
        this.throttle.settleCounted(slot);
      },
    });
    response.setHeader('Set-Cookie', serializeSessionCookie(created.token, created.maxAge));
    return created.student;
  }

  @Public()
  @Post('disconnect')
  @HttpCode(200)
  async disconnect(
    @Body() dto: Disconnect42Dto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Record<string, never>> {
    await authenticateSession(this.sessions, request, response);
    const actor = requestActor(request);
    const slot = this.reserveOrRefuse(request, request.auth?.email ?? '');
    try {
      return await this.fortyTwo.disconnect42({ actor, password: dto.password });
    } catch (err) {
      this.settleWhenCounted(slot, err);
      throw err;
    } finally {
      this.throttle.release(slot);
    }
  }

  @Public()
  @Post('password')
  @HttpCode(200)
  async setPassword(
    @Body() dto: Password42Dto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Record<string, never>> {
    await authenticateSession(this.sessions, request, response);
    const actor = requestActor(request);
    const cookie = parseSessionCookie(request.headers.cookie);
    if (cookie.kind !== 'session') throw new ApiError('unauthenticated');
    try {
      await this.fortyTwo.setPasswordAfter42({
        actor,
        sessionToken: cookie.token,
        newPassword: dto.newPassword,
      });
    } catch (err) {
      if (signedOutBy(err)) response.setHeader('Set-Cookie', clearSessionCookie());
      throw err;
    }
    response.setHeader('Set-Cookie', clearSessionCookie());
    return {};
  }
}
