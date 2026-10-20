import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public, requestActor } from '../core/session.guard';
import { CountedRefusal } from '../core/errors';
import { clearSessionCookie, parseSessionCookie, serializeSessionCookie } from '../core/session-cookie';
import { ThrottleStore, type ThrottleSlot } from '../core/throttle';
import { AuthService } from './auth.service';
import { LoginDto, PasswordDto, SignupDto } from './dto';
import { signedOutBy } from './password-change';
import { tooManyAttempts } from './refusals';

// §6.1: the throttle is enforced here, at the HTTP boundary, never inside
// the service. The service tells this boundary whether a refusal counts by
// throwing a `CountedRefusal`; anything else is not counted (§5.5).
@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly throttle: ThrottleStore,
  ) {}

  private key(request: Request, normalisedEmail: string): string {
    return ThrottleStore.key(ThrottleStore.clientAddress(request.headers['x-real-ip']), normalisedEmail);
  }

  private reserveOrRefuse(request: Request, normalisedEmail: string): ThrottleSlot {
    const slot = this.throttle.reserve(this.key(request, normalisedEmail));
    if (slot === null) throw tooManyAttempts();
    return slot;
  }

  // The session token from the request's cookie, or null when it carries no
  // session: the service's `already_signed_in` check takes it as input (§6.1).
  private sessionToken(request: Request): string | null {
    const parsed = parseSessionCookie(request.headers.cookie);
    return parsed.kind === 'session' ? parsed.token : null;
  }

  private settleWhenCounted(slot: ThrottleSlot, err: unknown): void {
    if (err instanceof CountedRefusal) this.throttle.settleCounted(slot);
  }

  // `POST /api/auth/signup`. Validation, then the throttle (every attempt
  // that passes validation is counted up front), then `already_signed_in`,
  // then §5.1's steps 2–5. Sets the cookie on success.
  @Public()
  @Post('auth/signup')
  async signup(
    @Body() dto: SignupDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    const slot = this.reserveOrRefuse(request, dto.email);
    this.throttle.settleCounted(slot);
    const created = await this.auth.signup({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      sessionToken: this.sessionToken(request),
    });
    response.setHeader('Set-Cookie', serializeSessionCookie(created.token, created.maxAge));
    return created.student;
  }

  // `POST /api/auth/login`. Validation, then a throttle slot, then
  // `already_signed_in`, then §5.1's steps 2–4. Only a counted refusal settles
  // the slot as counted; the release in `finally` frees it on every other
  // path. Sets the cookie on success.
  @Public()
  @Post('auth/login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    const slot = this.reserveOrRefuse(request, dto.email);
    try {
      const signedIn = await this.auth.login({
        email: dto.email,
        password: dto.password,
        sessionToken: this.sessionToken(request),
      });
      response.setHeader('Set-Cookie', serializeSessionCookie(signedIn.token, signedIn.maxAge));
      return signedIn.student;
    } catch (err) {
      this.settleWhenCounted(slot, err);
      throw err;
    } finally {
      this.throttle.release(slot);
    }
  }

  // `POST /api/auth/logout`. Session required (guard). Deletes that one row,
  // revokes its sockets after commit, clears the cookie (§5.8).
  @Post('auth/logout')
  @HttpCode(200)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<unknown> {
    await this.auth.logout(requestActor(request));
    response.setHeader('Set-Cookie', clearSessionCookie());
    return {};
  }

  // `POST /api/auth/password`. Session required (guard). Validation, then
  // the throttle under the signed-in Student's own email, then §5.1's steps
  // 2–6. The cookie is cleared on success, on a sanction found mid-change,
  // and on a step-5 failure — the exception filter keeps a `Set-Cookie` the
  // handler set before the failure — and on nothing else. A step-6 failure
  // never reaches this handler: step 5 already set the new password, so it
  // is answered as success.
  @Post('auth/password')
  @HttpCode(200)
  async changePassword(
    @Body() dto: PasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    const actor = requestActor(request);
    const email = request.auth?.email ?? '';
    const slot = this.reserveOrRefuse(request, email);
    try {
      await this.auth.changePassword(actor, dto.currentPassword, dto.newPassword);
    } catch (err) {
      this.settleWhenCounted(slot, err);
      // The guard's 401 never reaches this handler, so an `unauthenticated`
      // ApiError here is the step-4 refusal — a sanction, or a session a
      // previous change already deleted — which signs out.
      if (signedOutBy(err)) response.setHeader('Set-Cookie', clearSessionCookie());
      throw err;
    } finally {
      this.throttle.release(slot);
    }
    response.setHeader('Set-Cookie', clearSessionCookie());
    return {};
  }
}
