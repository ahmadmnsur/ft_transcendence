export type EnvRecord = Record<string, string | undefined>;

export type EnvFailure = {
  variable: string;
  reason: string;
};

export type EnvResult = { ok: true } | { ok: false; failure: EnvFailure };

const REQUIRED_VARS: string[] = [
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'DATABASE_URL',
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
    if (characters < 8 || characters > 128) {
      return fail(name, 'must be 8-128 characters');
    }
  }

  const databaseUrlRaw = env['DATABASE_URL'] as string;
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(databaseUrlRaw);
  } catch {
    return fail('DATABASE_URL', 'must be a valid URL');
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
    decodedUser !== env['POSTGRES_USER'] ||
    decodedPassword !== env['POSTGRES_PASSWORD'] ||
    decodedDb !== env['POSTGRES_DB']
  ) {
    return fail(
      'DATABASE_URL',
      'user, password and database must equal POSTGRES_USER, POSTGRES_PASSWORD and POSTGRES_DB - change both together; if the database was already initialised, run `make wipe`',
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
}
