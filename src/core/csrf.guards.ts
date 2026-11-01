import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppConfig } from './app-config';
import { API_PREFIX } from './configure-app';
import { ApiError } from './errors';

const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

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

function mediaType(request: Request): string {
  return (request.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
}

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
