import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import { testDatabaseUrl } from './test/harness/database';

const databaseUrl = process.env.DATABASE_URL;
const testEnv =
  databaseUrl === undefined || databaseUrl === ''
    ? {}
    : { DATABASE_URL: testDatabaseUrl(databaseUrl) };

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    testTimeout: 20_000,
    hookTimeout: 20_000,
    include: ['test/[0-9][0-9]-*/*.test.ts'],
    globalSetup: ['test/harness/global-setup.ts'],
    env: testEnv,
    fileParallelism: false,
  },
});
