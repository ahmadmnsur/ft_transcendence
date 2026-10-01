import {
  Injectable,
  StreamableFile,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';

// §3.8.1: the two shapes of every JSON response.
export type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

// Wraps what a handler returns as `{ ok: true, data }`. A file is sent as is.
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    return next
      .handle()
      .pipe(
        map((data: unknown) =>
          data instanceof StreamableFile ? data : { ok: true, data: data === undefined ? {} : data },
        ),
      );
  }
}
