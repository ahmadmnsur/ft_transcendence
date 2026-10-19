import {
  FortyTwoClient,
  type FortyTwoIdentity,
  type TokenAnswer,
} from '../../src/auth/forty-two-client';
import type { Harness, HarnessOptions } from './app';
import type { TestAccount } from './accounts';

// The fixed `/v2/me` answer (§16.3 row 12): one 42 identity, whose `id` a
// login resolves through and whose `email` another Student can take.
export const FIXED_ID = 42424242;
export const FIXED_EMAIL = 'fixed_login@42.example';

// The token exchange and `/v2/me` are replaced by fixed answers (§16.3 row
// 12); the authorize URL and everything else stay the real code. `identity`
// answers `login` and `email` only when the caller asked for them, mirroring
// §5.6 A step 7's read.
class FixedFortyTwoClient extends FortyTwoClient {
  override async exchangeCode(): Promise<TokenAnswer> {
    return { accessToken: 'fixed-access-token', secretValidUntil: null };
  }

  override async identity(
    accessToken: string,
    options: { withProfile: boolean },
  ): Promise<FortyTwoIdentity> {
    return {
      id: FIXED_ID,
      login: options.withProfile ? 'fixed_login' : '',
      email: options.withProfile ? FIXED_EMAIL : '',
    };
  }
}

// What a `12-sign-in` file passes `useHarness` for its 42 checks: 42
// configured, and the fixed client in place of the real one. `overrides`
// adds the file's own doubles after it.
export function fixedFortyTwo(options: HarnessOptions = {}): HarnessOptions {
  return {
    env: {
      FT_OAUTH_CLIENT_ID: 'test-42-client-id',
      FT_OAUTH_CLIENT_SECRET: 'test-42-client-secret',
      ...options.env,
    },
    overrides: (builder) => {
      const fixed = builder.overrideProvider(FortyTwoClient).useClass(FixedFortyTwoClient);
      return options.overrides?.(fixed) ?? fixed;
    },
  };
}

// Only the `pc_session=…` pairs, as a browser would send them: a
// `Set-Cookie` line carries attributes (`Max-Age`, `Path`, …) that a
// `Cookie` header never carries.
export function setCookies(headers: Record<string, string | string[] | undefined>): string {
  return [headers['set-cookie'] ?? []]
    .flat()
    .map((line) => (line.includes(';') ? line.slice(0, line.indexOf(';')) : line))
    .filter((pair) => pair.startsWith('pc_session='))
    .join('; ');
}

function authorizeUrl(body: unknown): string {
  const url = (body as { data?: { authorizeUrl?: unknown } }).data?.authorizeUrl;
  if (typeof url !== 'string') throw new Error('start42: no authorize_url.');
  return url;
}

// The `state` a start's authorize URL carries, which 42 would hand back to
// the callback.
export function stateOf(body: unknown): string {
  const state = new URL(authorizeUrl(body)).searchParams.get('state');
  if (state === null || state === '') throw new Error('start42: no state.');
  return state;
}

// The callback request a browser carrying `cookie` makes when 42 sends it
// back with the start's `state`.
export function callback(harness: Harness, state: string, cookie: string) {
  return harness
    .get(`/api/auth/42/callback?code=fixed-code&state=${encodeURIComponent(state)}`)
    .set('Cookie', cookie);
}

// A signed-in start, `link` with the account's password or `confirm` with
// none, followed through the callback the Student's browser would carry back,
// session cookie along. Returns the callback's answer.
export async function roundTrip(
  harness: Harness,
  account: TestAccount,
  intent: 'link' | 'confirm',
) {
  const started = await harness
    .post('/api/auth/42/start')
    .set('Cookie', account.cookie)
    .send(intent === 'link' ? { intent, password: account.password } : { intent });
  if ((started.body as { ok?: unknown }).ok !== true) {
    throw new Error(`start42 ${intent}: refused ${JSON.stringify(started.body)}.`);
  }
  return callback(harness, stateOf(started.body), account.cookie);
}
