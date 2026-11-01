import type { Prisma } from '../generated/prisma/client';

export function blockPair(a: string, b: string): Prisma.BlockWhereInput {
  return {
    OR: [
      { blockerId: a, blockedId: b },
      { blockerId: b, blockedId: a },
    ],
  };
}
