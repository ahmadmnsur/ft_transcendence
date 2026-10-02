import {
  Injectable,
  StreamableFile,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { REDIRECT_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';

// §3.8.1: the two shapes of every JSON response.
export type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

// Wraps what a handler returns as `{ ok: true, data }`. A file is sent as is,
// and so is a @Redirect() handler's { url, statusCode }, which Nest reads from
// the top level of the value.
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    if (this.reflector.get(REDIRECT_METADATA, context.getHandler()) !== undefined) {
      return next.handle();
    }
    return next
      .handle()
      .pipe(
        map((data: unknown) =>
          data instanceof StreamableFile ? data : { ok: true, data: data === undefined ? {} : data },
        ),
      );
  }
}
