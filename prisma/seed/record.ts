import type { Client } from 'pg';
import { SeedFailure } from './failure';
import { quoteIdentifier } from './sql';

export const FIXTURE_VERSION = 7;

const RECORD_PATTERN = /^peerconnect:seed:complete:fixture-v([1-9][0-9]*)$/;

function recordText(version: number): string {
  return `peerconnect:seed:complete:fixture-v${version}`;
}

async function currentDatabase(db: Client): Promise<string> {
  const result = await db.query<{ name: string }>('SELECT current_database() AS name');
  return quoteIdentifier(result.rows[0].name);
}

export async function readRecord(db: Client): Promise<number | null> {
  const result = await db.query<{ comment: string | null }>(
    `SELECT shobj_description(oid, 'pg_database') AS comment
       FROM pg_database WHERE datname = current_database()`,
  );
  if (result.rows.length !== 1) throw new SeedFailure('the current database is missing from pg_database');
  const match = RECORD_PATTERN.exec(result.rows[0].comment ?? '');
  return match === null ? null : Number(match[1]);
}

export async function clearRecord(db: Client): Promise<void> {
  await db.query(`COMMENT ON DATABASE ${await currentDatabase(db)} IS NULL`);
}

export async function writeRecord(db: Client, version: number): Promise<void> {
  await db.query(`COMMENT ON DATABASE ${await currentDatabase(db)} IS '${recordText(version)}'`);
}
