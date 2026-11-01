import type { ErrorCode, RefusalCode } from '@shared/codes';

export class ApiRefusalError extends Error {
  readonly code: RefusalCode;

  constructor(code: RefusalCode, message: string) {
    super(message);
    this.name = 'ApiRefusalError';
    this.code = code;
  }
}

export class ApiProtocolError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = 'ApiProtocolError';
    this.status = status;
    this.code = code;
  }
}

type UnauthorizedHandler = () => Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function unexpected(status: number): ApiProtocolError {
  return new ApiProtocolError(status, 'internal_error', 'The server returned an unexpected response.');
}

export function parseEnvelope<T>(status: number, body: unknown): T {
  if (!isRecord(body) || typeof body.ok !== 'boolean') throw unexpected(status);
  if (body.ok) {
    if (status < 200 || status >= 300 || !('data' in body)) throw unexpected(status);
    return body.data as T;
  }
  if (!isRecord(body.error)) throw unexpected(status);
  const { code, message } = body.error;
  if (typeof code !== 'string' || typeof message !== 'string') throw unexpected(status);
  if (status >= 200 && status < 300) throw new ApiRefusalError(code as RefusalCode, message);
  throw new ApiProtocolError(status, code as ErrorCode, message);
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function notifyUnauthorized(): Promise<void> {
  if (!unauthorizedHandler) return;
  try {
    await unauthorizedHandler();
  } catch {
  }
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  let payload: string | undefined;
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(options.body ?? {});
  }
  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: payload,
    credentials: 'same-origin',
  });
  if (response.status === 401 && path !== '/session') {
    await notifyUnauthorized();
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw unexpected(response.status);
  }
  return parseEnvelope<T>(response.status, body);
}
