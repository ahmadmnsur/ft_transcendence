import { Client } from 'pg';
import type { EnvRecord } from '../../src/core/env';

// Every test database is the development database's name with this suffix, so
// the main database can never be the one the harness drops (§16.2).
const TEST_DATABASE_SUFFIX = '_test';

// The database name DATABASE_URL points at, without touching that database.
export function testDatabaseName(databaseUrl: string | undefined): string {
  const url = parse(databaseUrl);
  const name = url.pathname.replace(/^\//, '').split('/')[0] ?? '';
  if (name === '') throw new Error('Test setup refused: DATABASE_URL does not name a database.');
  return `${name}${TEST_DATABASE_SUFFIX}`;
}

// DATABASE_URL with its database swapped for the derived test database.
export function testDatabaseUrl(databaseUrl: string | undefined): string {
  const url = parse(databaseUrl);
  url.pathname = `/${testDatabaseName(databaseUrl)}`;
  return url.toString();
}

function parse(databaseUrl: string | undefined): URL {
  try {
    return new URL(databaseUrl ?? '');
  } catch {
    throw new Error('Test setup refused: DATABASE_URL is not a valid URL.');
  }
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

// Drops and recreates the derived test database. The maintenance connection
// stays on the development database, whose name the derived test name never
// matches, so the development database is never touched (§16.2).
export async function recreateTestDatabase(env: EnvRecord): Promise<string> {
  const maintenanceUrl = parse(env['DATABASE_URL']);
  const name = testDatabaseName(env['DATABASE_URL']);
  const client = new Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();
  try {
    const identifier = quoteIdentifier(name);
    await client.query(`DROP DATABASE IF EXISTS ${identifier} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${identifier}`);
  } finally {
    await client.end();
  }
  return testDatabaseUrl(env['DATABASE_URL']);
}
