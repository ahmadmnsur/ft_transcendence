import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppConfig } from '../../src/core/app-config';
import { firstNonTlsParameter, resolveSupabaseTarget, type EnvRecord } from '../../src/core/env';
import { SupabaseStorageClient } from '../../src/core/supabase-storage';
import { ensureBuckets, TEST_BUCKETS } from '../../src/files/buckets';
import { recreateTestDatabase } from './database';
import {
  apiSnippetPath,
  assertNginxAvailable,
  checkNginxConfig,
  generateNginxConfig,
} from './nginx';

function assertFallback(env: EnvRecord): void {
  let databaseUrl: URL | undefined;
  try {
    databaseUrl = new URL(env['DATABASE_URL'] ?? '');
  } catch {
  }
  if (
    databaseUrl !== undefined &&
    databaseUrl.protocol !== 'postgresql:' &&
    databaseUrl.protocol !== 'postgres:'
  ) {
    throw new Error('Test setup refused: DATABASE_URL is not a postgresql: or postgres: URL.');
  }
  const parameter = databaseUrl === undefined ? undefined : firstNonTlsParameter(databaseUrl);
  if (parameter !== undefined) {
    throw new Error(
      `Test setup refused: DATABASE_URL sets ${parameter} in its query; only its TLS settings may stay.`,
    );
  }
  const target = resolveSupabaseTarget(env);
  if (target.kind === 'fallback') return;
  if (target.databaseHost !== 'db') {
    throw new Error(
      `Test setup refused: DATABASE_URL points at ${target.databaseHost}, not the local fallback.`,
    );
  }
  throw new Error(
    `Test setup refused: SUPABASE_URL points at ${target.supabaseHost}, not the local fallback.`,
  );
}

async function validateNginx(): Promise<void> {
  assertNginxAvailable();
  const prefix = await mkdtemp(join(tmpdir(), 'peerconnect-nginx-check-'));
  try {
    const configPath = join(prefix, 'nginx.conf');
    await writeFile(
      configPath,
      generateNginxConfig({ prefix, appPort: 18080, listenPort: 18080, apiSnippet: apiSnippetPath() }),
    );
    checkNginxConfig(prefix, configPath);
  } finally {
    await rm(prefix, { recursive: true, force: true });
  }
}

function runPrisma(args: string[], databaseUrl: string): void {
  const result = spawnSync('npx', ['prisma', ...args, '--config', 'prisma.config.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `Test setup refused: npx prisma ${args.join(' ')} failed.\n${result.stdout ?? ''}${result.stderr ?? ''}`,
    );
  }
}

export default async function setup(): Promise<void> {
  assertFallback(process.env);
  await validateNginx();
  const testUrl = await recreateTestDatabase(process.env);
  runPrisma(['generate'], testUrl);
  runPrisma(['migrate', 'deploy'], testUrl);
  process.env.DATABASE_URL = testUrl;
  await ensureBuckets(new SupabaseStorageClient(new AppConfig()), TEST_BUCKETS);
}
