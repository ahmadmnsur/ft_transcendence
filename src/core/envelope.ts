import {
  Injectable,
  StreamableFile,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { REDIRECT_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';
import { answerFailure } from './exception.filter';
import { AppLogger } from './logger';

export type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: AppLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    if (this.reflector.get(REDIRECT_METADATA, context.getHandler()) !== undefined) {
      return next.handle();
    }
    const http = context.switchToHttp();
    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof StreamableFile) {
          return data.setErrorHandler((err) => {
            const response = http.getResponse<Response>();
            if (!response.destroyed) answerFailure(this.logger, err, http.getRequest<Request>(), response);
          });
        }
        http.getResponse<Response>().setHeader('Cache-Control', 'no-store');
        return { ok: true, data: data === undefined ? {} : data };
      }),
    );
  }
}
