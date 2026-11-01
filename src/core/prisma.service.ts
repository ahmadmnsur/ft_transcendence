import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { connectionConfig } from './database-connection';

// Two members' stacks on the team project, plus `prisma migrate deploy` and the
// seed's two connections, its pool's and its lock's, must fit its session-mode
// Pool Size of 15: 2 × 5 + 3, with 2 to spare (ADR-0004 d11). node-postgres
// would otherwise open up to 10.
export const POOL_MAX = 5;

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
