import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppConfig } from './app-config';
import { API_PREFIX } from './configure-app';
import { ApiError } from './errors';

const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Exactly the three multipart upload routes (§5.4, ADR-0009 d3), as route
// patterns with parameter names dropped. Only their PUT uploads; their DELETE
// stays JSON.
const UPLOAD_ROUTES = new Set(
  ['me/avatar', 'admin/students/:/avatar', 'reviews/:/evidence'].map((route) => `/${API_PREFIX}/${route}`),
);

function isUpload(request: Request): boolean {
  const pattern: unknown = request.route?.path;
  return (
    request.method === 'PUT' &&
    typeof pattern === 'string' &&
    UPLOAD_ROUTES.has(pattern.replace(/:[^/]+/g, ':'))
  );
}

// The media type of the body, without parameters, lower-cased.
function mediaType(request: Request): string {
  return (request.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
}

// Every mutation outside the upload routes carries Content-Type
// application/json, which a cross-site form cannot send (§5.4).
@Injectable()
export class JsonMutationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest<Request>();
    if (!MUTATIONS.has(request.method) || isUpload(request)) return true;
    if (mediaType(request) !== 'application/json') throw new ApiError('unsupported_media_type');
    return true;
  }
}

// An upload carries Origin byte-equal to PUBLIC_ORIGIN and X-PeerConnect-CSRF: 1,
// else 403; then a multipart body, else 415 (§3.8.2, ADR-0009). Guards run
// before interceptors, so this refuses before Multer parses anything (§5.4).
@Injectable()
export class UploadCsrfGuard implements CanActivate {
  constructor(private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest<Request>();
    if (!isUpload(request)) return true;
    if (
      request.headers.origin !== this.config.publicOrigin ||
      request.headers['x-peerconnect-csrf'] !== '1'
    ) {
      throw new ApiError('csrf_rejected');
    }
    if (mediaType(request) !== 'multipart/form-data') throw new ApiError('unsupported_media_type');
    return true;
  }
}
