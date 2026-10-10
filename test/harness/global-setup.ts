import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveSupabaseTarget, type EnvRecord } from '../../src/core/env';
import { recreateTestDatabase } from './database';
import {
  apiSnippetPath,
  assertNginxAvailable,
  checkNginxConfig,
  generateNginxConfig,
} from './nginx';

// The suite only ever runs against the local fallback; a team or unknown target
// would let a stray `.env` point the harness at real data (§16.2). A query
// `host` or `hostaddr` is refused too, because pg would connect there instead
// of the hostname. Any scheme but postgresql: or postgres: is refused too,
// because pg reads a socket: URL's path as a socket directory.
function assertFallback(env: EnvRecord): void {
  let databaseUrl: URL | undefined;
  try {
    databaseUrl = new URL(env['DATABASE_URL'] ?? '');
  } catch {
    // An unset or unparseable URL is left to the refusals below.
  }
  if (
    databaseUrl !== undefined &&
    databaseUrl.protocol !== 'postgresql:' &&
    databaseUrl.protocol !== 'postgres:'
  ) {
    throw new Error('Test setup refused: DATABASE_URL is not a postgresql: or postgres: URL.');
  }
  for (const parameter of ['host', 'hostaddr']) {
    if (databaseUrl?.searchParams.has(parameter)) {
      throw new Error(
        `Test setup refused: DATABASE_URL sets ${parameter} in its query, not the local fallback.`,
      );
    }
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

// nginx is only validated here; the upload category starts the real binary
// (§16.2). A missing binary fails the suite rather than skipping.
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

// The Prisma CLI reads DATABASE_URL through prisma.config.ts; the test URL is
// passed explicitly so generate and deploy never touch the development database.
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
  // (a) Refuse anything that is not the local fallback, before any connection.
  assertFallback(process.env);
  // (b) The nginx binary must exist and accept the harness's generated config.
  await validateNginx();
  // (c) Drop and recreate the derived test database; the development database
  // is never touched.
  const testUrl = await recreateTestDatabase(process.env);
  // (d) The generated client is gitignored (§3.2); a fresh clone has none.
  runPrisma(['generate'], testUrl);
  runPrisma(['migrate', 'deploy'], testUrl);
  // (e) Every worker inherits the test URL before PrismaService is constructed.
  process.env.DATABASE_URL = testUrl;
}
