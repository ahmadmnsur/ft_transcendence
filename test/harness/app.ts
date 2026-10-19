import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import type { TestingModuleBuilder } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/core/configure-app';
import { PrismaService } from '../../src/core/prisma.service';
import { RealtimePublisher } from '../../src/core/realtime-publisher';
import { CheckpointHook } from '../../src/core/uow';
import { BarrierRegistry } from './barriers';
import { RecordingRealtimePublisher } from './recording-publisher';

type SupertestTest = ReturnType<ReturnType<typeof request>['get']>;

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type Harness = {
  // The real AppModule, booted in-process against the test database (§16.2).
  app: INestApplication;
  port: number;
  baseUrl: string;
  // The address every request carries in X-Real-IP for the current test; pass
  // an override to any request helper where a test asserts the throttle (§5.5).
  clientIp: string;
  recorder: RecordingRealtimePublisher;
  barriers: BarrierRegistry;
  http(method: HttpMethod, path: string, ip?: string): SupertestTest;
  get(path: string, ip?: string): SupertestTest;
  post(path: string, ip?: string): SupertestTest;
  put(path: string, ip?: string): SupertestTest;
  patch(path: string, ip?: string): SupertestTest;
  delete(path: string, ip?: string): SupertestTest;
  // Empties every public table except the migration ledger.
  truncate(): Promise<void>;
};

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function truncatePublicTables(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
       ORDER BY tablename`,
  );
  // A fresh clone has no migrations yet, so there is nothing to truncate.
  if (tables.length === 0) return;
  const list = tables.map((table) => `"public".${quoteIdentifier(table.tablename)}`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

// Options a file may pass `useHarness`, applied before its app boots.
// `env` entries are set before `AppModule` compiles — `AppConfig` reads the
// environment at construction — and restored as soon as the boot returns,
// so the values are in while the module compiles and no other file's app
// sees them: the suite runs its files one at a time. `overrides` runs after
// the shared provider overrides, for a file that must hand one component a
// test double.
export type HarnessOptions = {
  env?: Record<string, string>;
  overrides?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
};

// Registers the file's hooks and returns the shared harness. Call it once at
// the top level of a `*.test.ts` file that talks to the database or the API.
export function useHarness(options: HarnessOptions = {}): Harness {
  const recorder = new RecordingRealtimePublisher();
  const barriers = new BarrierRegistry();

  const harness: Harness = {
    app: undefined as unknown as INestApplication,
    port: 0,
    baseUrl: '',
    clientIp: '',
    recorder,
    barriers,
    http: (method, path, ip) =>
      request(harness.baseUrl)[method](path).set('X-Real-IP', ip ?? harness.clientIp),
    get: (path, ip) => harness.http('get', path, ip),
    post: (path, ip) => harness.http('post', path, ip),
    put: (path, ip) => harness.http('put', path, ip),
    patch: (path, ip) => harness.http('patch', path, ip),
    delete: (path, ip) => harness.http('delete', path, ip),
    truncate: () => truncatePublicTables(harness.app.get(PrismaService)),
  };

  let ipCounter = 0;

  beforeAll(async () => {
    const savedEnv = new Map<string, string | undefined>();
    for (const [key, value] of Object.entries(options.env ?? {})) {
      savedEnv.set(key, process.env[key]);
      process.env[key] = value;
    }
    try {
      const base = Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(RealtimePublisher)
        .useValue(recorder)
        .overrideProvider(CheckpointHook)
        .useValue(barriers);
      const moduleRef = await (options.overrides?.(base) ?? base).compile();
      const app = moduleRef.createNestApplication();
      configureApp(app);
      await app.listen(0, '127.0.0.1');
      harness.app = app;
      const address = app.getHttpServer().address();
      harness.port = typeof address === 'object' && address !== null ? address.port : 0;
      harness.baseUrl = `http://127.0.0.1:${harness.port}`;
    } finally {
      for (const [key, value] of savedEnv) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  }, 30_000);

  beforeEach(async () => {
    // A run a finished test left held keeps its read lock, so every held arrival
    // is rejected before the truncate: the run rolls back, and the truncate
    // waits only for that.
    barriers.reset();
    await harness.truncate();
    // Clear after the truncate, which waits for any transaction still open on
    // those tables to end.
    recorder.clear();
    ipCounter += 1;
    // One fixed address per test, so §5.5's key is deterministic within a test
    // and cannot leak a throttle bucket into the next one.
    harness.clientIp = `192.0.2.${((ipCounter - 1) % 250) + 1}`;
  });

  afterAll(async () => {
    // The file's last test gets no beforeEach after it, so its held arrivals are
    // rejected here, or a held request would keep app.close() waiting.
    barriers.reset();
    await harness.app?.close();
  }, 30_000);

  return harness;
}
