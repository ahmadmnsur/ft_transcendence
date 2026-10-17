import { ApiProtocolError, ApiRefusalError } from '../api/client';

// The code a failed write's sentence is chosen by: a refusal or a protocol
// error names its own, and anything else (a network failure, an unexpected
// throw) has none, so `errorText` shows the generic sentence (§6.15). The
// SPA never displays the server's `message`.
export function failureCode(error: unknown): unknown {
  if (error instanceof ApiRefusalError || error instanceof ApiProtocolError) return error.code;
  return undefined;
}
