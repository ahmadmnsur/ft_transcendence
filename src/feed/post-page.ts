import { encodeCursor, type Cursor } from '../core/cursor';
import type { PrismaTx } from '../core/uow';
import type { Prisma } from '../generated/prisma/client';
import { PAGING } from '../shared/limits';
import { postViewSelect, toPostView, type PostPage } from './views';

const POSTS_PER_PAGE = PAGING.maxPageSize;

// §6.0.1's keyset: the Posts after the last one the client already has, in
// the feed index's `(created_at DESC, id DESC)` order.
function olderThan(cursor: Cursor | null): Prisma.PostWhereInput {
  if (cursor === null) return {};
  return { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] };
}

// One page of the non-removed Posts that match `where`, newest first (§4.6).
// The Prompts module reads a Prompt's answers through it too (§6.8).
export async function readPostPage(
  tx: PrismaTx,
  viewerId: string,
  where: Prisma.PostWhereInput,
  cursor: Cursor | null,
): Promise<PostPage> {
  const rows = await tx.post.findMany({
    where: { AND: [where, { removedAt: null }, olderThan(cursor)] },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: POSTS_PER_PAGE + 1,
    select: postViewSelect(viewerId),
  });
  const items = rows.slice(0, POSTS_PER_PAGE);
  const last = items.at(-1);
  return {
    items: items.map(toPostView),
    nextCursor:
      rows.length > POSTS_PER_PAGE && last !== undefined ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
  };
}
