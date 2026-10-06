import 'dotenv/config';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

// `prisma migrate` runs on Prisma's own engine, which takes TLS from the URL
// only. On the team project's pooler it verifies Supabase's certificate
// strictly; the path must be absolute, since the engine does not find a
// relative one (ADR-0004 d11). The fallback's `db` stays a plain connection.
// This file cannot reuse src/core/env.ts: the production image has no src/.
function datasourceUrl(raw: string | undefined): string | undefined {
  let host = '';
  try {
    host = new URL(raw ?? '').hostname;
  } catch {
    return raw;
  }
  if (!host.endsWith('.pooler.supabase.com')) return raw;
  const tls = `sslmode=require&sslaccept=strict&sslcert=${resolve('supabase/prod-ca-2021.crt')}`;
  return `${raw}${raw?.includes('?') ? '&' : '?'}${tls}`;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node dist/prisma/seed/main.js',
  },
  datasource: {
    url: datasourceUrl(process.env.DATABASE_URL),
  },
});
