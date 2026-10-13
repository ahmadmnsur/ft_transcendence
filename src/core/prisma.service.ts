import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { connectionConfig } from './database-connection';

// Two members' stacks on the team project, plus `prisma migrate deploy` and the
// seed, must fit its session-mode Pool Size of 15: 2 × 5 + 2, with 3 to spare
// (ADR-0004 d11). node-postgres would otherwise open up to 10.
export const POOL_MAX = 5;

// The one Prisma client, through the pg driver adapter (§3.3). Its `log`
// option stays empty: Prisma's own logs can carry query values (§3.9).
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({ ...connectionConfig(process.env), max: POOL_MAX }),
      log: [],
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
