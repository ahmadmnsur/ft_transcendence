import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createConnection, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';

const TEMP_PATHS = ['client_body', 'proxy', 'fastcgi', 'uwsgi', 'scgi'] as const;

async function preparePrefix(prefix: string): Promise<void> {
  await chmod(prefix, 0o711);
  await mkdir(join(prefix, 'logs'));
  for (const name of TEMP_PATHS) {
    const path = join(prefix, name);
    await mkdir(path, { recursive: true });
    await chmod(path, 0o733);
  }
}

async function readErrorLog(prefix: string): Promise<string> {
  try {
    return await readFile(join(prefix, 'error.log'), 'utf8');
  } catch {
    return '';
  }
}

const NGINX_FAILURE = /\[(emerg|alert|crit|error)\]/;

function reportErrorLog(log: string): void {
  if (NGINX_FAILURE.test(log)) process.stderr.write(`nginx error.log:\n${log}\n`);
}

export function apiSnippetPath(): string {
  return resolve(process.cwd(), 'proxy', 'snippets', 'api.conf');
}

export type NginxConfigOptions = {
  prefix: string;
  appPort: number;
  listenPort: number;
  apiSnippet: string;
};

export function generateNginxConfig(options: NginxConfigOptions): string {
  return [
    'worker_processes 1;',
    `pid ${join(options.prefix, 'nginx.pid')};`,
    `error_log ${join(options.prefix, 'error.log')} warn;`,
    '',
    'events {',
    '    worker_connections 64;',
    '}',
    '',
    'http {',
    '    access_log off;',
    `    client_body_temp_path ${join(options.prefix, 'client_body')};`,
    `    proxy_temp_path ${join(options.prefix, 'proxy')};`,
    `    fastcgi_temp_path ${join(options.prefix, 'fastcgi')};`,
    `    uwsgi_temp_path ${join(options.prefix, 'uwsgi')};`,
    `    scgi_temp_path ${join(options.prefix, 'scgi')};`,
    '',
    '    map $http_upgrade $connection_upgrade {',
    '        default upgrade;',
    '        "" close;',
    '    }',
    '',
    '    upstream peerconnect_api {',
    `        server 127.0.0.1:${options.appPort};`,
    '    }',
    '',
    '    server {',
    `        listen 127.0.0.1:${options.listenPort};`,
    `        include ${options.apiSnippet};`,
    '    }',
    '}',
    '',
  ].join('\n');
}

export function assertNginxAvailable(): void {
  const probe = spawnSync('nginx', ['-v']);
  if (probe.error !== undefined && probe.error !== null) {
    throw new Error('Test setup refused: the nginx binary is not on PATH.');
  }
}

export function checkNginxConfig(prefix: string, configPath: string): void {
  const result = spawnSync(
    'nginx',
    ['-t', '-p', prefix, '-c', configPath, '-g', 'daemon off;'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(
      `Test setup refused: the generated nginx configuration is invalid.\n${result.stderr ?? ''}`,
    );
  }
}

export type NginxHarness = {
  baseUrl: string;
  stop(): Promise<void>;
};

export async function startNginx(appPort: number): Promise<NginxHarness> {
  assertNginxAvailable();
  const prefix = await mkdtemp(join(tmpdir(), 'peerconnect-nginx-'));
  await preparePrefix(prefix);
  const listenPort = await freeLoopbackPort();
  const configPath = join(prefix, 'nginx.conf');
  await writeFile(
    configPath,
    generateNginxConfig({ prefix, appPort, listenPort, apiSnippet: apiSnippetPath() }),
  );

  const child = spawn('nginx', ['-p', prefix, '-c', configPath, '-g', 'daemon off;'], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  try {
    await waitForListening(child, listenPort, () => stderr);
  } catch (err) {
    child.kill('SIGKILL');
    reportErrorLog(await readErrorLog(prefix));
    await rm(prefix, { recursive: true, force: true });
    throw err;
  }

  let stopped = false;
  return {
    baseUrl: `http://127.0.0.1:${listenPort}`,
    async stop(): Promise<void> {
      if (stopped) return;
      stopped = true;
      await stopChild(child);
      reportErrorLog(await readErrorLog(prefix));
      await rm(prefix, { recursive: true, force: true });
    },
  };
}

function freeLoopbackPort(): Promise<number> {
  return new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.unref();
    server.on('error', rejectPort);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function probe(port: number): Promise<void> {
  return new Promise((resolveProbe, rejectProbe) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolveProbe();
    });
    socket.once('error', (err) => {
      socket.destroy();
      rejectProbe(err);
    });
  });
}

async function waitForListening(
  child: ChildProcess,
  port: number,
  stderr: () => string,
): Promise<void> {
  const deadline = Date.now() + 5_000;
  for (;;) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Test setup refused: nginx exited before it accepted requests.\n${stderr()}`);
    }
    try {
      await probe(port);
      return;
    } catch {
      if (Date.now() > deadline) {
        throw new Error(`Test setup refused: nginx did not accept requests on ${port}.\n${stderr()}`);
      }
      await delay(25);
    }
  }
}

function stopChild(child: ChildProcess): Promise<void> {
  return new Promise((resolveStop) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolveStop();
      return;
    }
    const force = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
    }, 2_000);
    force.unref();
    child.once('exit', () => {
      clearTimeout(force);
      resolveStop();
    });
    child.kill('SIGTERM');
  });
}
