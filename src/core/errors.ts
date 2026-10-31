import { HttpException } from '@nestjs/common';
import type { ErrorCode, RefusalCode } from '../shared/codes';

export type { ErrorCode, RefusalCode } from '../shared/codes';

export const PROTOCOL_ERRORS = {
  validation_failed: { status: 400, message: 'The request is not valid.' },
  unauthenticated: { status: 401, message: 'You need to sign in.' },
  forbidden: { status: 403, message: 'You are not allowed to do this.' },
  csrf_rejected: { status: 403, message: 'The request was refused.' },
  not_found: { status: 404, message: 'Not found.' },
  payload_too_large: { status: 413, message: 'The request is too large.' },
  unsupported_media_type: { status: 415, message: 'The request format is not supported.' },
  internal_error: { status: 500, message: 'Something went wrong.' },
  busy_retry_later: { status: 503, message: 'The server is busy. Please try again.' },
} as const satisfies Record<ErrorCode, { status: number; message: string }>;

export type RefusalSpec = { code: RefusalCode; message: string };

export class Refusal extends Error {
  constructor(
    readonly code: RefusalCode,
    message: string,
  ) {
    super(message);
  }
}

export class CountedRefusal extends Refusal {}

export class ApiError extends HttpException {
  constructor(readonly code: ErrorCode) {
    super(PROTOCOL_ERRORS[code].message, PROTOCOL_ERRORS[code].status);
  }
}

export class ConcurrencyExhausted extends ApiError {
  constructor(readonly operation: string) {
    super('busy_retry_later');
  }
}
