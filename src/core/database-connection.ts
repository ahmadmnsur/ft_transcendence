import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolConfig } from 'pg';
import { isTlsSetting, resolveSupabaseTarget, type EnvRecord } from './env';

// Supabase signs the pooler's certificate with its own authority, which Node
// does not trust, so the team project is verified against this committed copy
// (ADR-0004 d11). Every image runs from /app, where the file sits.
const SUPABASE_CA_PATH = join(process.cwd(), 'supabase', 'prod-ca-2021.crt');

export type ConnectionConfig = Pick<PoolConfig, 'connectionString' | 'ssl'>;

// The URL and TLS settings every database client of the api uses: its pool, and
// the boot check's one connection (§15.5), so the check proves what the api will
// meet. This file loads no Prisma, since the dev image runs the check first.
export function connectionConfig(env: EnvRecord): ConnectionConfig {
  const config: ConnectionConfig = { connectionString: env['DATABASE_URL'] };
  // The fallback's `db` sits on the Compose network and stays a plain connection.
  if (resolveSupabaseTarget(env).kind === 'team') {
    // node-postgres lays the URL's own TLS settings over `ssl`, so a pasted
    // `?sslmode=no-verify` would switch the check off: the team URL loses them all.
    const url = new URL(env['DATABASE_URL'] as string);
    for (const key of [...url.searchParams.keys()]) {
      if (isTlsSetting(key)) url.searchParams.delete(key);
    }
    config.connectionString = url.toString();
    config.ssl = { ca: readFileSync(SUPABASE_CA_PATH), rejectUnauthorized: true };
  }
  return config;
}
