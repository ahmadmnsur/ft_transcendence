import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolConfig } from 'pg';
import { isTlsSetting, resolveSupabaseTarget, type EnvRecord } from './env';

const SUPABASE_CA_PATH = join(process.cwd(), 'supabase', 'prod-ca-2021.crt');

export type ConnectionConfig = Pick<PoolConfig, 'connectionString' | 'ssl'>;

export function connectionConfig(env: EnvRecord): ConnectionConfig {
  const config: ConnectionConfig = { connectionString: env['DATABASE_URL'] };
  if (resolveSupabaseTarget(env).kind === 'team') {
    const url = new URL(env['DATABASE_URL'] as string);
    for (const key of [...url.searchParams.keys()]) {
      if (isTlsSetting(key)) url.searchParams.delete(key);
    }
    config.connectionString = url.toString();
    config.ssl = { ca: readFileSync(SUPABASE_CA_PATH), rejectUnauthorized: true };
  }
  return config;
}
