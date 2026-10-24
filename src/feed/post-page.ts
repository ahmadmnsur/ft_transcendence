import type { PrismaTx } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { postViewSelect, toPostView, type PostPage } from './views';

// One numbered page of the non-removed Posts that match `where`, newest first
// (§4.6), in the feed index's `(created_at DESC, id DESC)` order, with the
// count of them all, so the SPA can number the pages (§6.0.1). Both reads run
// in the caller's read-only transaction, so `total` counts the Posts the page
// was cut from. A page past the end is empty. The Prompts module reads a
// Prompt's answers through it too (§6.8).
export async function readPostPage(
  tx: PrismaTx,
  viewerId: string,
  where: Prisma.PostWhereInput,
  page: number,
  pageSize: number,
): Promise<PostPage> {
  const visible = { AND: [where, { removedAt: null }] };
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
