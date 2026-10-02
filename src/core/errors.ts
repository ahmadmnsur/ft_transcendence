import { HttpException } from '@nestjs/common';

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
} as const;

export type ErrorCode = keyof typeof PROTOCOL_ERRORS;

// §6.15: the refusals a correctly built UI can reach in normal use. Answered
// 200 with ok: false, except dm_unavailable, which is a socket ack (§7.3).
export type RefusalCode =
  | 'invalid_credentials'
  | 'too_many_attempts'
  | 'email_unavailable'
  | 'password_incorrect'
  | 'already_signed_in'
  | 'student_removed'
  | 'self_action_forbidden'
  | 'last_active_admin'
  | 'already_suspended'
  | 'not_suspended'
  | 'goal_skill_not_listed'
  | 'file_too_large'
  | 'file_type_not_allowed'
  | 'file_invalid'
  | 'friend_request_unavailable'
  | 'friendship_exists'
  | 'request_not_pending'
  | 'not_friends'
  | 'already_blocked'
  | 'not_blocked'
  | 'dm_unavailable'
  | 'round_already_open'
  | 'no_open_round'
  | 'not_a_candidate'
  | 'already_matched'
  | 'pair_blocked'
  | 'same_student'
  | 'match_not_pending'
  | 'match_not_in_progress'
  | 'match_not_reviewable'
  | 'already_reviewed'
  | 'prompt_not_live'
  | 'already_answered'
  | 'admins_cannot_answer'
  | 'post_unavailable'
  | 'already_reported'
  | 'report_target_invalid'
  | 'already_resolved'
  | 'conflict_of_interest';

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
