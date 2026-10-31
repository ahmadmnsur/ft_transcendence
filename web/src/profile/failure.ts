import { ApiProtocolError, ApiRefusalError } from '../api/client';

export function failureCode(error: unknown): unknown {
  if (error instanceof ApiRefusalError || error instanceof ApiProtocolError) return error.code;
  return undefined;
}
