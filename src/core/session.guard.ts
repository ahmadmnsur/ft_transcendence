import { Injectable, SetMetadata, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { Actor } from './actor';
import { ApiError } from './errors';
import { clearSessionCookie, parseSessionCookie } from './session-cookie';
import { SessionResolver, type ActiveSession } from './session-resolver';

export const PUBLIC_KEY = 'pc:public';

export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(PUBLIC_KEY, true);

export type RequestAuth = Actor & Pick<ActiveSession, 'role' | 'email'>;

declare global {
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

export function requestRole(request: Request): RequestAuth['role'] {
  const auth = request.auth;
  if (auth === undefined) throw new ApiError('unauthenticated');
  return auth.role;
}

export async function authenticateSession(
  sessions: SessionResolver,
  request: Request,
  response: Response,
): Promise<void> {
  const parsed = parseSessionCookie(request.headers.cookie);
  if (parsed.kind !== 'session') throw new ApiError('unauthenticated');
  const session = await sessions.resolveActive(parsed.token);
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
  await sessions.renewIfStale(session, parsed.token, response);
}

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
    await authenticateSession(
      this.sessions,
      http.getRequest<Request>(),
      http.getResponse<Response>(),
    );
    return true;
  }
}
