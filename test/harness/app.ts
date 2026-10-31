import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import type { TestingModuleBuilder } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Clock } from '../../src/core/clock';
import { configureApp } from '../../src/core/configure-app';
import { PrismaService } from '../../src/core/prisma.service';
import { RealtimePublisher } from '../../src/core/realtime-publisher';
import { CheckpointHook } from '../../src/core/uow';
import { FileBuckets, TEST_BUCKETS } from '../../src/files/buckets';
import { FileCleanupSchedule } from '../../src/files/cleanup-schedule';
import { BarrierRegistry } from './barriers';
import { TestClock } from './clock';
import { RecordingRealtimePublisher } from './recording-publisher';

type SupertestTest = ReturnType<ReturnType<typeof request>['get']>;

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type Harness = {
  app: INestApplication;
  port: number;
  baseUrl: string;
  clientIp: string;
  recorder: RecordingRealtimePublisher;
  barriers: BarrierRegistry;
  clock: TestClock;
  http(method: HttpMethod, path: string, ip?: string): SupertestTest;
  get(path: string, ip?: string): SupertestTest;
  post(path: string, ip?: string): SupertestTest;
  put(path: string, ip?: string): SupertestTest;
  patch(path: string, ip?: string): SupertestTest;
  delete(path: string, ip?: string): SupertestTest;
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
  if (tables.length === 0) return;
  const list = tables.map((table) => `"public".${quoteIdentifier(table.tablename)}`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export type HarnessOptions = {
  env?: Record<string, string>;
  overrides?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
};

export function useHarness(options: HarnessOptions = {}): Harness {
  const recorder = new RecordingRealtimePublisher();
  const barriers = new BarrierRegistry();
  const clock = new TestClock();

  const harness: Harness = {
    app: undefined as unknown as INestApplication,
    port: 0,
    baseUrl: '',
    clientIp: '',
    recorder,
    barriers,
    clock,
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
        .useValue(barriers)
        .overrideProvider(Clock)
        .useValue(clock)
        .overrideProvider(FileBuckets)
        .useValue(TEST_BUCKETS)
        .overrideProvider(FileCleanupSchedule)
        .useValue({});
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
    barriers.reset();
    clock.reset();
    await harness.truncate();
    recorder.clear();
    ipCounter += 1;
    harness.clientIp = `192.0.2.${((ipCounter - 1) % 250) + 1}`;
  });

  afterAll(async () => {
    barriers.reset();
    await harness.app?.close();
  }, 30_000);

  return harness;
}
