import { Injectable } from '@nestjs/common';

function nonEmpty(value: string | undefined): boolean {
  return value !== undefined && value !== '';
}

// What the app reads from the environment main.ts has already validated
// (§15.4).
@Injectable()
export class AppConfig {
  readonly publicOrigin = process.env['PUBLIC_ORIGIN'] as string;

  // Sign in with 42 is enabled only when both variables are non-empty
  // (§5.6 A); otherwise nothing fails at boot.
  readonly oauth42Enabled =
    nonEmpty(process.env['FT_OAUTH_CLIENT_ID']) && nonEmpty(process.env['FT_OAUTH_CLIENT_SECRET']);
}
