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
