import { queryOptions } from '@tanstack/react-query';
import { ApiProtocolError, apiFetch } from './client';

// §6.1: what `GET /api/config` reports. The SPA needs `oauth42Enabled`: the
// 42 button appears only when it is true.
export interface AppConfigValue {
  publicOrigin: string;
  oauth42Enabled: boolean;
}

export const CONFIG_QUERY_KEY = ['config'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function unexpected(): ApiProtocolError {
  return new ApiProtocolError(200, 'internal_error', 'The server returned an unexpected response.');
}

// A fresh probe through the client; only the shape of `data` is checked.
export async function fetchConfig(): Promise<AppConfigValue> {
  const data = await apiFetch<unknown>('/config');
  if (
    !isRecord(data) ||
    typeof data.publicOrigin !== 'string' ||
    typeof data.oauth42Enabled !== 'boolean'
  ) {
    throw unexpected();
  }
  return { publicOrigin: data.publicOrigin, oauth42Enabled: data.oauth42Enabled };
}

// One query key for the config, cached like the session's. A failed probe
// leaves `data` undefined, and the page treats "not known" as "off": no
// button.
export function configQueryOptions() {
  return queryOptions({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: fetchConfig,
    staleTime: 30_000,
  });
}
