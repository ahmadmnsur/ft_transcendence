import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ApiError } from './errors';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest<Request>();
    const pattern = typeof request.route?.path === 'string' ? request.route.path : request.path;
    const scope = pattern.toLowerCase().split('/').slice(0, 3).join('/');
    const needsAdmin = scope === '/api/admin';
    const needsModeration = scope === '/api/moderation';
    if (!needsAdmin && !needsModeration) return true;
    const auth = request.auth;
    if (auth === undefined) throw new ApiError('unauthenticated');
    if (needsAdmin && auth.role !== 'ADMIN') throw new ApiError('forbidden');
    if (needsModeration && auth.role !== 'PEER_MODERATOR' && auth.role !== 'ADMIN') {
      throw new ApiError('forbidden');
    }
    return true;
  }
}
