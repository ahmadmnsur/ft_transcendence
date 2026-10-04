export type EnvRecord = Record<string, string | undefined>;

export type EnvFailure = {
  variable: string;
  reason: string;
};

export type EnvResult = { ok: true } | { ok: false; failure: EnvFailure };

export type SupabaseTarget =
  | { kind: 'fallback' }
  | { kind: 'team'; ref: string; databaseHost: string; supabaseHost: string }
  | { kind: 'none'; databaseHost: string; supabaseHost: string };

const REQUIRED_VARS: string[] = [
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'NODE_ENV',
  'PUBLIC_ORIGIN',
  'HTTPS_PORT',
  'HTTP_PORT',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'MODERATOR_EMAIL',
  'MODERATOR_PASSWORD',
  'SEED_STUDENT_PASSWORD',
];

const PASSWORD_VARS: string[] = [
  'ADMIN_PASSWORD',
  'MODERATOR_PASSWORD',
  'SEED_STUDENT_PASSWORD',
];

function fail(variable: string, reason: string): EnvResult {
  return { ok: false, failure: { variable, reason } };
}

function parseUrl(value: string | undefined): URL | undefined {
  try {
    return new URL(value ?? '');
  } catch {
    return undefined;
  }
}

// The pooler user carries the project ref; its host and the API host must both
// belong to Supabase before the two values can name the team project.
export function resolveSupabaseTarget(env: EnvRecord): SupabaseTarget {
  const databaseUrl = parseUrl(env['DATABASE_URL']);
  const supabaseUrl = parseUrl(env['SUPABASE_URL']);
  const databaseHost = databaseUrl?.hostname ?? '<invalid>';
  const supabaseHost = supabaseUrl?.hostname ?? '<invalid>';

  if (databaseHost === 'db' && supabaseHost === 'api-gw') {
    return { kind: 'fallback' };
  }

  let databaseUser = '';
  try {
    databaseUser = decodeURIComponent(databaseUrl?.username ?? '');
  } catch {
    return { kind: 'none', databaseHost, supabaseHost };
  }
  const poolerUser = /^postgres\.([a-z0-9]+)$/.exec(databaseUser);
  const projectHost = /^([a-z0-9]+)\.supabase\.co$/.exec(supabaseHost);
  // The api's requests to Supabase carry the secret key and passwords, and nothing else
  // encrypts that hop, so only https: names the team project.
  if (
    poolerUser &&
    projectHost &&
    poolerUser[1] === projectHost[1] &&
    databaseHost.endsWith('.pooler.supabase.com') &&
    supabaseUrl?.protocol === 'https:'
  ) {
    return { kind: 'team', ref: poolerUser[1], databaseHost, supabaseHost };
  }

  return { kind: 'none', databaseHost, supabaseHost };
}

// Pure validation over an env record. Returns the first failure so both
// entry points share one ordering and one message shape.
export function validateEnv(env: EnvRecord): EnvResult {
  for (const name of REQUIRED_VARS) {
    const value = env[name];
    if (value === undefined || value === '') {
      return fail(name, 'is required and must not be empty');
    }
  }

  const originRaw = env['PUBLIC_ORIGIN'] as string;
  let origin: URL;
  try {
    origin = new URL(originRaw);
  } catch {
    return fail('PUBLIC_ORIGIN', 'must be a valid http(s) URL');
  }
  if (origin.protocol !== 'http:' && origin.protocol !== 'https:') {
    return fail('PUBLIC_ORIGIN', 'must use http or https');
  }
  if (originRaw !== origin.origin) {
    return fail(
      'PUBLIC_ORIGIN',
      'must be a bare origin with no path, query, fragment, credentials or trailing slash',
    );
  }

  for (const name of PASSWORD_VARS) {
    const value = env[name] as string;
    const characters = Array.from(value).length;
    if (characters < 8 || Buffer.byteLength(value, 'utf8') > 72) {
      return fail(name, 'must be 8 characters to 72 bytes in UTF-8');
    }
  }

  const databaseUrlRaw = env['DATABASE_URL'] as string;
  const databaseUrl = parseUrl(databaseUrlRaw);
  if (
    !databaseUrl ||
    !['postgres:', 'postgresql:'].includes(databaseUrl.protocol) ||
    databaseUrl.hostname === '' ||
    databaseUrl.username === '' ||
    databaseUrl.password === '' ||
    databaseUrl.pathname === '/'
  ) {
    return fail('DATABASE_URL', 'must be a PostgreSQL URL with a host, user, password and database');
  }

  const supabaseUrl = parseUrl(env['SUPABASE_URL']);
  if (!supabaseUrl || !['http:', 'https:'].includes(supabaseUrl.protocol) || supabaseUrl.hostname === '') {
    return fail('SUPABASE_URL', 'must be a valid http(s) URL');
  }
  let decodedUser: string;
  let decodedPassword: string;
  let decodedDb: string;
  try {
    decodedUser = decodeURIComponent(databaseUrl.username);
    decodedPassword = decodeURIComponent(databaseUrl.password);
    const firstSegment = databaseUrl.pathname.replace(/^\//, '').split('/')[0] ?? '';
    decodedDb = decodeURIComponent(firstSegment);
  } catch {
    return fail('DATABASE_URL', 'must use decodable percent-encoding');
  }
  if (
    resolveSupabaseTarget(env).kind === 'fallback' &&
    (decodedUser !== env['POSTGRES_USER'] ||
      decodedPassword !== env['POSTGRES_PASSWORD'] ||
      decodedDb !== env['POSTGRES_DB'])
  ) {
    return fail(
      'DATABASE_URL',
      'at host db, user, password and database must match .env.example; delete an old .env or replace it with a copy of .env.example',
    );
  }

  if (origin.protocol === 'https:') {
    const effectivePort = origin.port === '' ? '443' : origin.port;
    if (effectivePort !== env['HTTPS_PORT']) {
      return fail('HTTPS_PORT', 'must equal the effective port of PUBLIC_ORIGIN');
    }
  }

  return { ok: true };
}

// Single exit path shared by the API entry point and the seed entry point.
export function assertEnvOrExit(env: EnvRecord): void {
  const result = validateEnv(env);
  if (!result.ok) {
    console.error(`Invalid environment: ${result.failure.variable}: ${result.failure.reason}`);
    process.exit(1);
  }

  const target = resolveSupabaseTarget(env);
  if (target.kind === 'none') {
    console.error(
      `Supabase check failed: DATABASE_URL host ${target.databaseHost} and SUPABASE_URL host ${target.supabaseHost} do not name one target`,
    );
    process.exit(1);
  }
  if (target.kind === 'team') {
    console.error(
      `Supabase check failed: DATABASE_URL host ${target.databaseHost} and SUPABASE_URL host ${target.supabaseHost} name a team project; use make local or make dev until the remaining checks and TLS land`,
    );
    process.exit(1);
  }
}
