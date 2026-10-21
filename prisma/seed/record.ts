import type { Client } from 'pg';
import { SeedFailure } from './failure';
import { quoteIdentifier } from './sql';

// The fixture version this checkout writes (§14.9). Any PR that changes the
// fixture bumps it. v1: the catalogue, the bootstrap Admin and Peer
// Moderator, and §14.8's check 10. v2: §14.3's thirty Students with their
// lists and Goals, the Peer Moderator's lists, and §14.8's check 7. v3: X's
// Block of Y, four closed Rounds with declines, repairs and acceptances,
// and §14.8's checks 1 (Rounds), 2 and 8. v4: the Mentee's Review of both
// repairs and every step-h Match, with §14.5's sentences and ratings, and
// §14.8's check 4.
export const FIXTURE_VERSION = 4;

// Only this text is a record. Both databases start with Postgres's own
// comment, "default administrative connection database", which is none.
const RECORD_PATTERN = /^peerconnect:seed:complete:fixture-v([1-9][0-9]*)$/;

function recordText(version: number): string {
  return `peerconnect:seed:complete:fixture-v${version}`;
}

// COMMENT ON DATABASE takes a name, not an expression, so the current
// database's name is read first.
async function currentDatabase(db: Client): Promise<string> {
  const result = await db.query<{ name: string }>('SELECT current_database() AS name');
  return quoteIdentifier(result.rows[0].name);
}

// The fixture version of the record, or null when the database carries no
// record. A failed read throws: it never counts as no record.
export async function readRecord(db: Client): Promise<number | null> {
  const result = await db.query<{ comment: string | null }>(
    `SELECT shobj_description(oid, 'pg_database') AS comment
       FROM pg_database WHERE datname = current_database()`,
  );
  if (result.rows.length !== 1) throw new SeedFailure('the current database is missing from pg_database');
  const match = RECORD_PATTERN.exec(result.rows[0].comment ?? '');
  return match === null ? null : Number(match[1]);
}

// A stale record is cleared as a run's first write, so a run that fails
// later never leaves a record over rows it does not certify.
export async function clearRecord(db: Client): Promise<void> {
  await db.query(`COMMENT ON DATABASE ${await currentDatabase(db)} IS NULL`);
}

// The very last statement of a run, after every assertion passed.
export async function writeRecord(db: Client, version: number): Promise<void> {
  await db.query(`COMMENT ON DATABASE ${await currentDatabase(db)} IS '${recordText(version)}'`);
}
