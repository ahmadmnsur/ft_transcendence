import {
  HttpException,
  Injectable,
  PayloadTooLargeException,
  mixin,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
  type Type,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Observable } from 'rxjs';
import { ApiError } from '../core/errors';
import { fileTooLarge } from './refusals';

// §9.5 step 2: Multer reads the one `file` part into memory, with
// `limits.fileSize` at the cap + 1 byte, so a boundary payload reaches the
// service intact and the service judges it. A file past Multer's own limit
// aborts the stream and takes the same `file_too_large` path; any other
// multipart fault, a second file, another field or a broken body, is
// `validation_failed`. Guards run before interceptors, so UploadCsrfGuard
// and the session guard have already run before Multer reads a byte (§5.4).
// A browser sends the file's name as UTF-8, which Busboy would read as
// Latin-1 unless told, garbling an accented or Arabic Evidence name.
export function FileUpload(maxBytes: number): Type<NestInterceptor> {
  const Multer = FileInterceptor('file', {
    limits: { fileSize: maxBytes + 1, files: 1, fields: 0 },
    defParamCharset: 'utf8',
  });

  @Injectable()
  class FileUploadInterceptor implements NestInterceptor {
    private readonly multer = new Multer();

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
      try {
        return await this.multer.intercept(context, next);
      } catch (err) {
        if (err instanceof PayloadTooLargeException) throw fileTooLarge();
        if (err instanceof HttpException) throw new ApiError('validation_failed');
        throw err;
      }
    }
  }

  return mixin(FileUploadInterceptor);
}
