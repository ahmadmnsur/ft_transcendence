import type { ErrorCode } from '../../codes';

// Text chosen by a code is keyed by the code and typed over its union. The
// `as const` keeps each text's literal type, so its placeholders are checked.
export default {
  validation_failed: 'Check the highlighted fields.',
  not_found: 'This was not found.',
  internal_error: 'Something went wrong.',
} as const satisfies Record<ErrorCode, string>;
