import { Client, DatabaseError } from 'pg';
import { connectionConfig } from './database-connection';
import { resolveSupabaseTarget, type EnvRecord } from './env';

const ANSWER_TIMEOUT_MS = 10_000;

type KeyCall = {
  service: 'Auth' | 'Storage';
  variable: 'SUPABASE_PUBLISHABLE_KEY' | 'SUPABASE_SECRET_KEY';
  path: string;
};

const KEY_CALLS: KeyCall[] = [
  { service: 'Auth', variable: 'SUPABASE_PUBLISHABLE_KEY', path: '/auth/v1/settings' },
  { service: 'Auth', variable: 'SUPABASE_SECRET_KEY', path: '/auth/v1/admin/users?page=1&per_page=1' },
  { service: 'Storage', variable: 'SUPABASE_SECRET_KEY', path: '/storage/v1/bucket' },
];

const FALLBACK_REMEDY =
  "; the fallback's database keeps the password it was created with, so POSTGRES_PASSWORD and LOCAL_DATABASE_URL in .env must match it, or make wipe recreates the database";

export function errorCodeSuffix(err: unknown): string {
  const code = (err as { cause?: { code?: unknown } } | undefined)?.cause?.code ?? (err as { code?: unknown } | undefined)?.code;
  if (typeof code === 'string' && /^[A-Z0-9_]+$/.test(code)) return ` (${code})`;
  if (err instanceof Error && err.name === 'TimeoutError') return ' (timeout)';
  return '';
}

export async function checkSupabaseKeys(env: EnvRecord): Promise<string | undefined> {
  const supabaseUrl = new URL(env['SUPABASE_URL'] as string);
  for (const call of KEY_CALLS) {
    const key = env[call.variable] as string;
    let status: number;
    try {
      const response = await fetch(new URL(call.path, supabaseUrl.origin), {
        headers: { apikey: key, authorization: `Bearer ${key}` },
        redirect: 'manual',
        signal: AbortSignal.timeout(ANSWER_TIMEOUT_MS),
      });
      status = response.status;
      await response.body?.cancel();
    } catch (err) {
      return `no answer from SUPABASE_URL host ${supabaseUrl.host}${errorCodeSuffix(err)}`;
    }
    if (status === 540) return `${supabaseUrl.origin} answered 540: the project is paused`;
    if (status === 401 || status === 403) return `${call.service} rejected ${call.variable} (${status})`;
    if (status < 200 || status > 299) {
      return `${call.service} at SUPABASE_URL host ${supabaseUrl.host} answered ${status}`;
    }
  }
  return undefined;
}

export async function checkDatabase(env: EnvRecord): Promise<string | undefined> {
  const host = new URL(env['DATABASE_URL'] as string).hostname;
  const client = new Client({ ...connectionConfig(env), connectionTimeoutMillis: ANSWER_TIMEOUT_MS });
  let closedWith: unknown;
  client.on('error', (err) => {
    closedWith ??= err;
  });
  try {
    await client.connect();
  } catch (err) {
    if (err instanceof DatabaseError) {
      const remedy = resolveSupabaseTarget(env).kind === 'fallback' ? FALLBACK_REMEDY : '';
      return `the database at ${host} refused DATABASE_URL${errorCodeSuffix(err)}${remedy}`;
    }
    return `could not connect to DATABASE_URL host ${host}${errorCodeSuffix(err)}`;
  }
  const closed = await Promise.race([
    client.end().then(
      () => true,
      () => true,
    ),
    new Promise<false>((resolve) => setTimeout(resolve, ANSWER_TIMEOUT_MS, false).unref()),
  ]);
  if (closedWith !== undefined) {
    return `the database at ${host} accepted DATABASE_URL, then closed the connection${errorCodeSuffix(closedWith)}`;
  }
  if (!closed) {
    return `the database at ${host} accepted DATABASE_URL but did not close the connection within ${ANSWER_TIMEOUT_MS / 1000} s`;
  }
  return undefined;
}
