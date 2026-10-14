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

// §3.8.1: the two shapes of every JSON response.
export type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

// Wraps what a handler returns as `{ ok: true, data }`. A file is sent as is,
// and so is a @Redirect() handler's { url, statusCode }, which Nest reads from
// the top level of the value. A file whose stream fails is answered like any
// other failure, since Nest's default sends 400 with the error's message as
// the body.
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
    const response = http.getResponse<Response>();
    // Authenticated JSON carries `Cache-Control: no-store` (§3.10). Set on
    // every JSON response, success and failure, which covers it.
    response.setHeader('Cache-Control', 'no-store');
    return next.handle().pipe(
      map((data: unknown) => {
        if (!(data instanceof StreamableFile)) return { ok: true, data: data === undefined ? {} : data };
        return data.setErrorHandler((err) => {
          const response = http.getResponse<Response>();
          if (!response.destroyed) answerFailure(this.logger, err, http.getRequest<Request>(), response);
        });
      }),
    );
  }
}
