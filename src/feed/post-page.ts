import type { PrismaTx } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { postViewSelect, toPostView, type PostPage } from './views';

export function visiblePostsWhere(where: Prisma.PostWhereInput): Prisma.PostWhereInput {
  return { AND: [where, { removedAt: null }] };
}

export async function readPostPage(
  tx: PrismaTx,
  viewerId: string,
  where: Prisma.PostWhereInput,
  page: number,
  pageSize: number,
): Promise<PostPage> {
  const visible = visiblePostsWhere(where);
  const total = await tx.post.count({ where: visible });
  const skip = (page - 1) * pageSize;
  if (skip >= total) return { items: [], total };
  const rows = await tx.post.findMany({
    where: visible,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip,
    take: pageSize,
    select: postViewSelect(viewerId),
  });
  return { items: rows.map(toPostView), total };
}
