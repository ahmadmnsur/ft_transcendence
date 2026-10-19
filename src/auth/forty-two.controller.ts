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

// §6.1: the throttle stays at the HTTP boundary, keyed on address and email
// (§5.5). The 42 sign-up counts every attempt under its body's email, the
// way `auth/signup` does; Connect 42's start counts a refused current
// password through the service's wrapper, under the session's email; and
// Disconnect 42 counts under the signed-in Student's own email. The draft
// read counts nothing: it writes nothing and carries no email. Confirm with
// 42's start and its new password count nothing either: neither checks a
// password (§5.6 C).
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

  // §5.6 A step 2 + §5.5: Connect 42's start counts a wrong current password
  // under the signed-in Student's own email, which the service learns only
  // after resolving the session — so the boundary hands the service this
  // wrapper: reserve for the email, await the check (a refusal escapes the
  // `catch` only once it is thrown into an awaited call, §5.6 A step 2),
  // settle counted on a `CountedRefusal`, release in `finally` (M37) — the
  // same shape as `auth`'s `changePassword`.
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

  // `POST /api/auth/42/start` (§5.6 A step 1, §6.1): a JSON mutation. The
  // service mints the attempt under the cookie's binding; this boundary
  // answers the SPA's next navigation. Only `sign_in` sets the `a.` cookie;
  // a `link` or `confirm` start leaves the session cookie exactly as it is.
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
    // A successful 42 sign-in replaces the attempt cookie: the new session
    // cookie is the one `Set-Cookie` this answer sets (§5.6 B).
    if (outcome.sessionCookie !== undefined) {
      response.setHeader(
        'Set-Cookie',
        serializeSessionCookie(outcome.sessionCookie.token, outcome.sessionCookie.maxAge),
      );
    }
    return { url: outcome.location, statusCode: 302 };
  }

  // `GET /api/auth/42/draft` (§5.6 B): `{ login, email }` for the 42 sign-up
  // form. Public, and read-only: the draft is never removed by this read.
  @Public()
  @Get('draft')
  async draft(@Req() request: Request): Promise<{ login: string; email: string }> {
    return this.fortyTwo.signUpDraft(parseSessionCookie(request.headers.cookie));
  }

  // `POST /api/auth/42/signup` (§5.6 B): a route of its own, so it can never
  // be taken for an ordinary sign-up. The order is §5.1's: no `a.` cookie is
  // refused `oauth_failed` here, before anything; the service then refuses a
  // missing or expired draft the same way, before the throttle, so it costs
  // no counted attempt; and every attempt past that is counted, the way the
  // ordinary sign-up counts up front. The service calls back through
  // `countAttempt` — the boundary keeps the throttle, §5.5 "Layer". On
  // success the session cookie replaces the attempt cookie.
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
      // Reserve, settle counted at once — counted whatever the sign-up
      // turns out, exactly as `auth/signup` — so a full bucket refuses
      // before anything else runs (§5.5).
      countAttempt: (email) => {
        const slot = this.reserveOrRefuse(request, email);
        this.throttle.settleCounted(slot);
      },
    });
    response.setHeader('Set-Cookie', serializeSessionCookie(created.token, created.maxAge));
    return created.student;
  }

  // `POST /api/auth/42/disconnect` (§5.6 B): a session route. `@Public` only
  // so the controller's enabled guard answers 404 first while 42 is off
  // (§5.6 A), before any session lookup; the handler does the session
  // resolution the global guard would, through the same
  // `authenticateSession` (§5.3), so a stale `s.` cookie still gets 401 plus
  // the cleared cookie. `requestActor` builds the `Actor` the service acts
  // for (§3.4); the throttle counts under that Student's own email, its slot
  // settled counted on a `CountedRefusal` and released in `finally`, as
  // `changePassword` does.
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

  // `POST /api/auth/42/password` (§5.6 C): the new password after Confirm
  // with 42, a session route `@Public` for the same reason as Disconnect 42
  // above, and resolved the same way. No throttle: it checks no password, so
  // it counts nothing and has nothing to slow down (§5.5). The cookie is
  // cleared as `auth/password` clears it: on success, and on a failure that
  // left the Student signed out (`signedOutBy`); a refusal before the first
  // sign-out, `confirmation_required` among them, leaves it.
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
