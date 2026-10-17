import { Injectable } from '@nestjs/common';

function nonEmpty(value: string | undefined): value is string {
  return value !== undefined && value !== '';
}

// What the app reads from the environment main.ts has already validated
// (§15.4). A boot which skips main.ts's env validation (such as a test
// harness) fails here instead of running the upload gate against an
// undefined origin.
@Injectable()
export class AppConfig {
  readonly publicOrigin: string;
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
  readonly supabaseSecretKey: string;

  // Sign in with 42's client pair, or null when either variable is empty
  // (§5.6 A); otherwise nothing fails at boot. Only the transport reads the
  // values themselves; everything else asks `oauth42Enabled`.
  readonly oauth42: { clientId: string; clientSecret: string } | null;

  get oauth42Enabled(): boolean {
    return this.oauth42 !== null;
  }

  constructor() {
    const publicOrigin = process.env['PUBLIC_ORIGIN'];
    if (!nonEmpty(publicOrigin)) throw new Error('PUBLIC_ORIGIN is required');
    this.publicOrigin = publicOrigin;
    // Like PUBLIC_ORIGIN: the Supabase Auth client refuses to construct
    // without them (§5.1).
    const supabaseUrl = process.env['SUPABASE_URL'];
    if (!nonEmpty(supabaseUrl)) throw new Error('SUPABASE_URL is required');
    this.supabaseUrl = supabaseUrl;
    const publishableKey = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!nonEmpty(publishableKey)) throw new Error('SUPABASE_PUBLISHABLE_KEY is required');
    this.supabasePublishableKey = publishableKey;
    const secretKey = process.env['SUPABASE_SECRET_KEY'];
    if (!nonEmpty(secretKey)) throw new Error('SUPABASE_SECRET_KEY is required');
    this.supabaseSecretKey = secretKey;
    const clientId = process.env['FT_OAUTH_CLIENT_ID'];
    const clientSecret = process.env['FT_OAUTH_CLIENT_SECRET'];
    this.oauth42 =
      nonEmpty(clientId) && nonEmpty(clientSecret) ? { clientId, clientSecret } : null;
  }
}
