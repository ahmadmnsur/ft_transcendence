import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import type { PoolConfig } from 'pg';
import { PrismaClient } from '../generated/prisma/client';
import { resolveSupabaseTarget, type EnvRecord } from './env';

// Two members' stacks on the team project, plus `prisma migrate deploy` and the
// seed, must fit its session-mode Pool Size of 15: 2 × 5 + 2, with 3 to spare
// (ADR-0004 d11). node-postgres would otherwise open up to 10.
export const POOL_MAX = 5;

// Supabase signs the pooler's certificate with its own authority, which Node
// does not trust, so the team project is verified against this committed copy
// (ADR-0004 d11). Every image runs from /app, where the file sits.
export const SUPABASE_CA_PATH = join(process.cwd(), 'supabase', 'prod-ca-2021.crt');

export function poolConfig(env: EnvRecord): PoolConfig {
  const config: PoolConfig = { connectionString: env['DATABASE_URL'], max: POOL_MAX };
  // The fallback's `db` sits on the Compose network and stays a plain connection.
  if (resolveSupabaseTarget(env).kind === 'team') {
    config.ssl = { ca: readFileSync(SUPABASE_CA_PATH), rejectUnauthorized: true };
  }
  return config;
}

// The one Prisma client, through the pg driver adapter (§3.3). Its `log`
// option stays empty: Prisma's own logs can carry query values (§3.9).
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg(poolConfig(process.env)),
      log: [],
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
