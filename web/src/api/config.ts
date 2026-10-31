import { queryOptions } from '@tanstack/react-query';
import { ApiProtocolError, apiFetch } from './client';

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

export function configQueryOptions() {
  return queryOptions({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: fetchConfig,
    staleTime: 30_000,
  });
}
