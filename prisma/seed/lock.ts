import { Client } from 'pg';
import { connectionConfig } from '../../src/core/database-connection';
import type { EnvRecord } from '../../src/core/env';

// The session advisory lock the seed and both resets take (§14.9, §15.6):
// the ASCII bytes of "PEERSEED" as one bigint.
export const SEED_LOCK_KEY = '5784105516313953604';

// The connection sits idle for a whole run, and node-postgres turns TCP
// keepalives off by default (ADR-0017 d10's note of 2026-10-11).
const KEEPALIVE_DELAY_MS = 5_000;

export type LockConnection = {
  client: Client;
  // Ends the connection on purpose, which frees the lock. A close after this
  // is not a loss.
  release(): Promise<void>;
};

// Opens the lock's own connection, outside the api's pool: Prisma gives a
// connection back after each operation, so a lock taken through it would not
// be held by the run (§14.9). `onLost` runs once if the connection errors or
// closes before `release`; the caller stops at once, with no reconnect,
// since another seed could take the freed lock and start deleting.
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
  // A failed connect rejects here, and is no loss: the listeners join after.
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

// Takes the lock on that connection, waiting while another seed or a reset
// holds it. `onWait` runs once before the wait. The wait runs with no
// statement timeout, which `SET LOCAL` keeps to this one transaction; the
// lock itself is the session's and outlives the commit.
export async function takeSeedLock(client: Client, onWait: () => void): Promise<void> {
  const tried = await client.query<{ locked: boolean }>(
    'SELECT pg_try_advisory_lock($1::bigint) AS locked',
    [SEED_LOCK_KEY],
  );
  if (tried.rows[0].locked) return;
  onWait();
  await client.query('BEGIN');
  await client.query('SET LOCAL statement_timeout = 0');
  await client.query('SELECT pg_advisory_lock($1::bigint)', [SEED_LOCK_KEY]);
  await client.query('COMMIT');
}
