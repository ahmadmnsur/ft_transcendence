import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Envelope } from './envelope';
import { ApiError, PROTOCOL_ERRORS, Refusal, type ErrorCode } from './errors';
import { AppLogger, errorFields } from './logger';

// The code for a status raised by Nest or Express itself: a ValidationPipe or
// ParseUUIDPipe failure, an unknown route, a body the parser refused.
const CODE_BY_STATUS: Readonly<Record<number, ErrorCode>> = {
  400: 'validation_failed',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  413: 'payload_too_large',
  415: 'unsupported_media_type',
};

function statusOf(exception: unknown): number | undefined {
  if (exception instanceof HttpException) return exception.getStatus();
  // An http-errors object from the body parser, e.g. a body over its limit.
  const e = exception as { status?: unknown; expose?: unknown } | null;
  return typeof e?.status === 'number' && e.expose === true ? e.status : undefined;
}

function classify(exception: unknown): { status: number; code: ErrorCode; message: string } {
  if (exception instanceof ApiError) {
    return { status: exception.getStatus(), code: exception.code, message: exception.message };
  }
  const status = statusOf(exception);
  const code = (status === undefined ? undefined : CODE_BY_STATUS[status]) ?? 'internal_error';
  return { status: PROTOCOL_ERRORS[code].status, code, message: PROTOCOL_ERRORS[code].message };
}

// §3.8.2: a refusal is 200 with ok: false; a protocol failure keeps its status;
// anything else is 500 internal_error. Only a 5xx is logged, by its route
// pattern and errorFields (§3.9); refusals and 4xx never are.
export function answerFailure(
  logger: AppLogger,
  exception: unknown,
  request: Request,
  response: Response,
): void {
  const { status, code, message } =
    exception instanceof Refusal
      ? { status: 200, code: exception.code, message: exception.message }
      : classify(exception);
  if (status >= 500) {
    const route: unknown = request.route?.path;
    logger.entry('error', {
      method: request.method,
      route: typeof route === 'string' ? route : null,
      ...errorFields(exception),
    });
  }
  if (response.headersSent) {
    response.end();
    return;
  }
  const body: Envelope<never> = { ok: false, error: { code, message } };
  // A failed file stream has already set its own type and disposition.
  response.removeHeader('Content-Disposition');
  // `Cache-Control: no-store` on every JSON response, success and failure
  // (§3.10). Set beside, never instead of, the headers the handler already
  // set: a `Set-Cookie` written before the failure still reaches the browser.
  response.setHeader('Cache-Control', 'no-store');
  response.status(status).type('application/json').json(body);
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception;
    const http = host.switchToHttp();
    answerFailure(
      this.logger,
      exception,
      http.getRequest<Request>(),
      http.getResponse<Response>(),
    );
  }
}
