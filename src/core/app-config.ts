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

  // Sign in with 42 is enabled only when both variables are non-empty
  // (§5.6 A); otherwise nothing fails at boot.
  readonly oauth42Enabled: boolean;

  constructor() {
    const publicOrigin = process.env['PUBLIC_ORIGIN'];
    if (!nonEmpty(publicOrigin)) throw new Error('PUBLIC_ORIGIN is required');
    this.publicOrigin = publicOrigin;
    this.oauth42Enabled =
      nonEmpty(process.env['FT_OAUTH_CLIENT_ID']) &&
      nonEmpty(process.env['FT_OAUTH_CLIENT_SECRET']);
  }
}
