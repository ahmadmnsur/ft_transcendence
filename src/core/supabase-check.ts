import { Client, DatabaseError } from 'pg';
import { connectionConfig } from './database-connection';
import { resolveSupabaseTarget, type EnvRecord } from './env';

// How long each call of steps 3 and 4 waits before the check names the host.
const ANSWER_TIMEOUT_MS = 10_000;

type KeyCall = {
  service: 'Auth' | 'Storage';
  variable: 'SUPABASE_PUBLISHABLE_KEY' | 'SUPABASE_SECRET_KEY';
  path: string;
};

// Step 3's calls only read: Auth's settings with the key the password grant
// uses, then one read for each thing the secret key opens, Auth's admin calls
// and Storage (§15.4). Each carries its key the way the api's calls do.
const KEY_CALLS: KeyCall[] = [
  { service: 'Auth', variable: 'SUPABASE_PUBLISHABLE_KEY', path: '/auth/v1/settings' },
  { service: 'Auth', variable: 'SUPABASE_SECRET_KEY', path: '/auth/v1/admin/users?page=1&per_page=1' },
  { service: 'Storage', variable: 'SUPABASE_SECRET_KEY', path: '/storage/v1/bucket' },
];

// The fallback's `db` initialized from .env.example's password, so a .env that
// changes it names a password that database never read.
const FALLBACK_REMEDY =
  "; the fallback's database never reads .env, so use make dev or make local, or remove .env or replace it with a copy of .env.example";

// A failure message carries a variable's name, a host and a status only (§3.9,
// §15.4): an error's own message can quote the URL, so only its code is kept,
// and only when it looks like one, as a suffix such as " (28P01)".
export function errorCodeSuffix(err: unknown): string {
  const code = (err as { cause?: { code?: unknown } } | undefined)?.cause?.code ?? (err as { code?: unknown } | undefined)?.code;
  if (typeof code === 'string' && /^[A-Z0-9_]+$/.test(code)) return ` (${code})`;
  if (err instanceof Error && err.name === 'TimeoutError') return ' (timeout)';
  return '';
}

// Step 3 (§15.5): Supabase Auth and Storage accept the keys. It runs before the
// database because only these HTTP addresses answer 540 for a paused project;
// the pooler just refuses the connection. Returns the failure, if any.
export async function checkSupabaseKeys(env: EnvRecord): Promise<string | undefined> {
  const supabaseUrl = new URL(env['SUPABASE_URL'] as string);
  for (const call of KEY_CALLS) {
    const key = env[call.variable] as string;
    let status: number;
    try {
      const response = await fetch(new URL(call.path, supabaseUrl.origin), {
        headers: { apikey: key, authorization: `Bearer ${key}` },
        // A redirect would carry the key to another address; it counts as a refusal.
        redirect: 'manual',
        signal: AbortSignal.timeout(ANSWER_TIMEOUT_MS),
      });
      status = response.status;
      await response.body?.cancel();
    } catch (err) {
      return `no answer from SUPABASE_URL host ${supabaseUrl.host}${errorCodeSuffix(err)}`;
    }
    if (status === 540) return `${supabaseUrl.origin} answered 540: the project is paused`;
    // Only 401 and 403 are the key's fault; an outage's 5xx must not blame a key.
    if (status === 401 || status === 403) return `${call.service} rejected ${call.variable} (${status})`;
    if (status < 200 || status > 299) {
      return `${call.service} at SUPABASE_URL host ${supabaseUrl.host} answered ${status}`;
    }
  }
  return undefined;
}

// Step 4 (§15.5): the database accepts DATABASE_URL, through one connection
// with the api pool's own TLS settings, closed at once. Returns the failure, if any.
export async function checkDatabase(env: EnvRecord): Promise<string | undefined> {
  const host = new URL(env['DATABASE_URL'] as string).hostname;
  const client = new Client({ ...connectionConfig(env), connectionTimeoutMillis: ANSWER_TIMEOUT_MS });
  // An error the server sends once the connection is open, such as a FATAL right
  // after login, reaches only this listener: the first one is kept and fails the
  // step, instead of ending the process with its message.
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
  // Closing gets the same deadline, so a server that never closes its side
  // cannot leave the boot waiting with nothing printed (§15.5).
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
