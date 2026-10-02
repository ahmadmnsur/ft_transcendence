import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// The one Prisma client, through the pg driver adapter (§3.3). Its `log`
// option stays empty: Prisma's own logs can carry query values (§3.9).
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
      log: [],
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
