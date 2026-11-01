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

  private sessionToken(request: Request): string | null {
    const parsed = parseSessionCookie(request.headers.cookie);
    return parsed.kind === 'session' ? parsed.token : null;
  }

  private settleWhenCounted(slot: ThrottleSlot, err: unknown): void {
    if (err instanceof CountedRefusal) this.throttle.settleCounted(slot);
  }

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

  @Post('auth/logout')
  @HttpCode(200)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<unknown> {
    await this.auth.logout(requestActor(request));
    response.setHeader('Set-Cookie', clearSessionCookie());
    return {};
  }

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
      if (signedOutBy(err)) response.setHeader('Set-Cookie', clearSessionCookie());
      throw err;
    } finally {
      this.throttle.release(slot);
    }
    response.setHeader('Set-Cookie', clearSessionCookie());
    return {};
  }
}
