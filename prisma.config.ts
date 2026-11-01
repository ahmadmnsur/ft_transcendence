import 'dotenv/config';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

function datasourceUrl(raw: string | undefined): string | undefined {
  let url: URL;
  try {
    url = new URL(raw ?? '');
  } catch {
    return raw;
  }
  if (!url.hostname.endsWith('.pooler.supabase.com')) return raw;
  url.searchParams.set('sslmode', 'require');
  url.searchParams.set('sslaccept', 'strict');
  url.searchParams.set('sslcert', resolve('supabase/prod-ca-2021.crt'));
  url.searchParams.set('connect_timeout', '30');
  return url.toString();
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
