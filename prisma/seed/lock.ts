import { Client } from 'pg';
import { connectionConfig } from '../../src/core/database-connection';
import type { EnvRecord } from '../../src/core/env';

export const SEED_LOCK_KEY = '5784105516313953604';

const KEEPALIVE_DELAY_MS = 5_000;

export type LockConnection = {
  client: Client;
  release(): Promise<void>;
};

export async function openLockConnection(env: EnvRecord, onLost: () => void): Promise<LockConnection> {
  const client = new Client({
    ...connectionConfig(env),
    keepAlive: true,
    keepAliveInitialDelayMillis: KEEPALIVE_DELAY_MS,
  });
  let released = false;
  let lost = false;
  const loseOnce = (): void => {
    if (released || lost) return;
    lost = true;
    onLost();
  };
  await client.connect();
  client.on('error', loseOnce);
  client.on('end', loseOnce);
  return {
    client,
    release: async () => {
      released = true;
      await client.end();
    },
  };
}

export async function tryTakeSeedLock(client: Client): Promise<boolean> {
  const tried = await client.query<{ locked: boolean }>(
    'SELECT pg_try_advisory_lock($1::bigint) AS locked',
    [SEED_LOCK_KEY],
  );
  return tried.rows[0].locked;
}

export async function takeSeedLock(client: Client, onWait: () => void): Promise<void> {
  if (await tryTakeSeedLock(client)) return;
  onWait();
  await client.query('BEGIN');
  await client.query('SET LOCAL statement_timeout = 0');
  await client.query('SELECT pg_advisory_lock($1::bigint)', [SEED_LOCK_KEY]);
  await client.query('COMMIT');
}
