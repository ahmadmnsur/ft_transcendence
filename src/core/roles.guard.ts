import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ApiError } from './errors';

// §5.3: the coarse role check, global, after SessionGuard. `/api/admin/*`
// needs ADMIN, `/api/moderation/*` needs PEER_MODERATOR or ADMIN; otherwise
// 403 forbidden.
//
// The check reads the matched route pattern, not the URL: Express routing is
// case-insensitive by default, so `/api/ADMIN/users` would reach an admin
// handler past a case-sensitive URL comparison. The pattern is compared
// lower-cased; when no route matched yet, the lower-cased URL is the fallback.
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
