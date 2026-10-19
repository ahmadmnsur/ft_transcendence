import type { Client } from 'pg';
import type { SupabaseAuthClient } from '../../src/core/supabase-auth';
import type { SupabaseStorageClient } from '../../src/core/supabase-storage';
import { FILE_KINDS, PRODUCTION_BUCKETS } from '../../src/files/buckets';
import { quoteIdentifier } from './sql';

function qualified(table: string): string {
  return `"public".${quoteIdentifier(table)}`;
}

// Every domain table: every table of the migrated schema except Prisma's
// ledger, read from the catalogue at run time rather than a fixed list, so
// the same checks hold at every fixture version (§14.9).
async function domainTables(db: Client): Promise<string[]> {
  const result = await db.query<{ name: string }>(
    `SELECT tablename AS name FROM pg_tables
       WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
       ORDER BY tablename`,
  );
  return result.rows.map((row) => row.name);
}

export async function anyDomainRows(db: Client): Promise<boolean> {
  const tables = await domainTables(db);
  if (tables.length === 0) return false;
  const probes = tables.map((table) => `EXISTS (SELECT 1 FROM ${qualified(table)})`).join(' OR ');
  const result = await db.query<{ found: boolean }>(`SELECT ${probes} AS found`);
  return result.rows[0].found;
}

export type Emptied = { tables: number; authUsers: number; files: number };

// §14.9's emptying, the one function the seed and both resets share
// (ADR-0004 d11's note of 2026-10-11): the rows of our tables in one
// TRUNCATE, then every Supabase Auth user through the admin API, then every
// file in `avatars` and `evidence` through Storage's, never by SQL into
// `auth` or `storage`. Run on the lock's connection.
export async function emptyEverything(
  db: Client,
  auth: SupabaseAuthClient,
  storage: SupabaseStorageClient,
): Promise<Emptied> {
  const tables = await domainTables(db);
  if (tables.length > 0) {
    await db.query(`TRUNCATE TABLE ${tables.map(qualified).join(', ')}`);
  }
  // Listed whole before any is deleted: deleting page by page skips some.
  const userIds = await auth.adminListUserIds();
  for (const id of userIds) await auth.adminDeleteUserOrThrow(id);
  // Each bucket listed whole before any of its files is deleted. A bucket
  // not made yet lists as empty: the resets do not run the bucket step.
  let files = 0;
  for (const bucket of FILE_KINDS.map((kind) => PRODUCTION_BUCKETS[kind])) {
    const names = (await storage.listAll(bucket)).map((file) => file.name);
    await storage.remove(bucket, names);
    files += names.length;
  }
  return { tables: tables.length, authUsers: userIds.length, files };
}
