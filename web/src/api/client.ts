import type { ErrorCode, RefusalCode } from '@shared/codes';

// A 200 `ok: false` refusal: a normal, typed outcome a form can show (§3.8.2).
export class ApiRefusalError extends Error {
  readonly code: RefusalCode;

  constructor(code: RefusalCode, message: string) {
    super(message);
    this.name = 'ApiRefusalError';
    this.code = code;
  }
}

// Any non-2xx, or a body that is not a valid envelope (§3.8.2). A body like
// nginx's HTML 502 becomes one too, never a silent default.
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

// The router registers its 401 handler at startup, so the client never
// imports the router and no import cycle forms.
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function unexpected(status: number): ApiProtocolError {
  return new ApiProtocolError(status, 'internal_error', 'The server returned an unexpected response.');
}

// The §3.8.1 envelope, validated before anything is read from it. A
// non-2xx never resolves: with an `ok: false` body it keeps the server's
// code and message, otherwise it is an unexpected response.
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

// Runs the router's 401 handler, for a request that answered 401. The
// upload, which is not a `fetch`, calls it too. The handler never masks the
// original failure.
export async function notifyUnauthorized(): Promise<void> {
  if (!unauthorizedHandler) return;
  try {
    await unauthorizedHandler();
  } catch {
    // The caller still rejects with its own failure.
  }
}

// Same-origin `fetch` against `/api` (§3.5.2). Mutations always send JSON,
// `{}` when there is nothing else, since the JSON mutation guard answers
// 415 otherwise (§5.4). Multipart uploads are not handled here: they send
// `XMLHttpRequest` for progress events (§3.5.2).
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  let payload: string | undefined;
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(options.body ?? {});
  }
  // A network failure rejects here and propagates as-is; it is never swallowed.
  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: payload,
    credentials: 'same-origin',
  });
  if (response.status === 401 && path !== '/session') {
    // A 401 means not signed in whatever the body says, so this is decided
    // from the status before the body parses: an empty or non-JSON body
    // must not skip the re-probe. The session probe itself never triggers
    // this path, and the original request still rejects with its 401 below
    // (§3.8.2).
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
