import { Client } from 'pg';
import type { EnvRecord } from '../../src/core/env';

const TEST_DATABASE_SUFFIX = '_test';

export function testDatabaseName(databaseUrl: string | undefined): string {
  const url = parse(databaseUrl);
  const name = url.pathname.replace(/^\//, '').split('/')[0] ?? '';
  if (name === '') throw new Error('Test setup refused: DATABASE_URL does not name a database.');
  return `${name}${TEST_DATABASE_SUFFIX}`;
}

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
