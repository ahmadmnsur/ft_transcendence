import { Injectable, SetMetadata, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { Actor } from './actor';
import { ApiError } from './errors';
import { clearSessionCookie, parseSessionCookie } from './session-cookie';
import { SessionResolver, type ActiveSession } from './session-resolver';

export const PUBLIC_KEY = 'pc:public';

// Opt-out of the default-deny session guard for exactly the public routes:
// `GET /api/health`, `GET /api/config`, `GET /api/session`,
// `POST /api/auth/signup`, `POST /api/auth/login` (§5.3), and §5.6's
// `POST /api/auth/42/start` and `GET /api/auth/42/callback` (the enabled
// guard on that controller answers 404 first while 42 is off).
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(PUBLIC_KEY, true);

// What the guard attaches to the request on success: the Actor (§3.4) plus
// the role and email it read in the same query, which the roles guard and
// the password change's throttle key need (§5.3).
export type RequestAuth = Actor & Pick<ActiveSession, 'role' | 'email'>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: RequestAuth;
    }
  }
}

export function requestActor(request: Request): Actor {
  const auth = request.auth;
  if (auth === undefined) throw new ApiError('unauthenticated');
  return { studentId: auth.studentId, sessionHash: auth.sessionHash };
}

// §5.3: the global guard (default deny). Only an `s.` value proceeds; an
// `a.` value or anything else fails with 401 without clearing the cookie,
// since this guard clears only a cookie it read as `s.`. No row, Suspended
// or Removed fails with 401, clears that `s.` cookie and writes nothing.
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) return true;
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const parsed = parseSessionCookie(request.headers.cookie);
    if (parsed.kind !== 'session') throw new ApiError('unauthenticated');
    const session = await this.sessions.resolveActive(parsed.token);
    if (session === null) {
      response.setHeader('Set-Cookie', clearSessionCookie());
      throw new ApiError('unauthenticated');
    }
    request.auth = {
      studentId: session.studentId,
      sessionHash: session.sessionHash,
      role: session.role,
      email: session.email,
    };
    await this.sessions.renewIfStale(session, parsed.token, response);
    return true;
  }
}
