import type { Client } from 'pg';
import type { SupabaseAuthClient } from '../../src/core/supabase-auth';
import type { SupabaseStorageClient } from '../../src/core/supabase-storage';
import { FILE_KINDS, PRODUCTION_BUCKETS } from '../../src/files/buckets';
import { quoteIdentifier } from './sql';

function qualified(table: string): string {
  return `"public".${quoteIdentifier(table)}`;
}

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

export async function emptyEverything(
  db: Client,
  auth: SupabaseAuthClient,
  storage: SupabaseStorageClient,
): Promise<Emptied> {
  const tables = await domainTables(db);
  if (tables.length > 0) {
    await db.query(`TRUNCATE TABLE ${tables.map(qualified).join(', ')}`);
  }
  const userIds = await auth.adminListUserIds();
  for (const id of userIds) await auth.adminDeleteUserOrThrow(id);
  let files = 0;
  for (const bucket of FILE_KINDS.map((kind) => PRODUCTION_BUCKETS[kind])) {
    const names = (await storage.listAll(bucket)).map((file) => file.name);
    await storage.remove(bucket, names);
    files += names.length;
  }
  return { tables: tables.length, authUsers: userIds.length, files };
}
