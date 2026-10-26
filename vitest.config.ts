import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import { testDatabaseUrl } from './test/harness/database';

// Global setup creates and migrates the derived test database; every worker
// then boots the app against it, because test.env is applied to process.env
// before a PrismaService is constructed (§16.2). A missing DATABASE_URL is left
// for global setup to refuse with a clear message.
const databaseUrl = process.env.DATABASE_URL;
const testEnv =
  databaseUrl === undefined || databaseUrl === ''
    ? {}
    : { DATABASE_URL: testDatabaseUrl(databaseUrl) };

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    // Shared Docker work can push sub-second tests and hooks past their 5 s and 10 s defaults.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    include: ['test/[0-9][0-9]-*/*.test.ts'],
    globalSetup: ['test/harness/global-setup.ts'],
    env: testEnv,
    fileParallelism: false,
  },
});
