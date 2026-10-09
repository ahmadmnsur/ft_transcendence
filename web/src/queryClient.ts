import { QueryClient } from '@tanstack/react-query';
import { ApiProtocolError, ApiRefusalError } from './api/client';

// Queries retry only network failures and 503 busy_retry_later, at most
// twice; never a refusal, a 4xx or a 500, so normal use keeps the console
// clean (§3.8.2). Mutations never retry.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof ApiRefusalError) return false;
  if (error instanceof ApiProtocolError) {
    return error.status === 503 && error.code === 'busy_retry_later';
  }
  return error instanceof TypeError;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry },
    mutations: { retry: false },
  },
});
