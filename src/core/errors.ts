import { HttpException } from '@nestjs/common';
import type { ErrorCode, RefusalCode } from '../shared/codes';

export type { ErrorCode, RefusalCode } from '../shared/codes';

// §6.15: the protocol failures, each with its status (§3.8.2). The message is
// fixed per code, so no framework or driver text ever reaches a client.
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

// A refusal (§3.8.2). Thrown inside a Unit of Work it also rolls the
// transaction back, so a refused operation writes nothing.
export class Refusal extends Error {
  constructor(
    readonly code: RefusalCode,
    message: string,
  ) {
    super(message);
  }
}

// A refusal the HTTP boundary counts toward the throttle (§5.5): `no_account`
// or Supabase Auth refusing the password. Every other refusal — a lost race
// (a moved `password_version`, also answered `password_incorrect`), a sanction
// told after the right password, a Supabase 429, Supabase Auth unreachable —
// is a plain Refusal and is not counted. Only this subclass is counted, so a
// new refusal is uncounted unless it opts in here.
export class CountedRefusal extends Refusal {}

// A protocol failure with its §6.15 code.
export class ApiError extends HttpException {
  constructor(readonly code: ErrorCode) {
    super(PROTOCOL_ERRORS[code].message, PROTOCOL_ERRORS[code].status);
  }
}

// The Unit of Work ran out of attempts; nothing was committed (§3.6.2).
export class ConcurrencyExhausted extends ApiError {
  constructor(readonly operation: string) {
    super('busy_retry_later');
  }
}
