import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { dropFromFriendLists } from './friends';
import type { StudentRef } from './profile';
import { writeAsSignedIn } from './session';

// §6.4's Block routes, with the exact wire shapes the API returns.

// One of the signed-in Student's own Blocks. A Removed Student comes as the
// tombstone (§6.0.1); `createdAt` is an ISO 8601 timestamp.
export interface BlockView {
  student: StudentRef;
  createdAt: string;
}

export interface BlockList {
  items: BlockView[];
}

export const BLOCKS_QUERY_KEY = ['blocks'] as const;

export async function fetchBlocks(): Promise<BlockList> {
  return apiFetch<BlockList>('/blocks');
}

// A refusal (`already_blocked`, `student_removed`, `self_action_forbidden`,
// `not_blocked`) is a typed 200 (§6.15).
export async function blockStudent(studentId: string): Promise<BlockView> {
  return apiFetch<BlockView>('/blocks', { method: 'POST', body: { studentId } });
}

export async function unblockStudent(studentId: string): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>(`/blocks/${encodeURIComponent(studentId)}`, {
    method: 'DELETE',
    body: {},
  });
}

// One list, read by a profile's Block control and by `/friends`, so both
// always agree. It is briefly cached like the own profile: the profile page
// starts the read and the control reads it a moment later without a second
// request, and every write here updates the cached copy at once.
export function blocksQueryOptions() {
  return queryOptions({
    queryKey: BLOCKS_QUERY_KEY,
    queryFn: fetchBlocks,
    staleTime: 30_000,
  });
}

// After a write: a read still in flight read the list before it, so it is
// cancelled first; then the cached list takes the write's result at once.
async function cacheBlockAdded(queryClient: QueryClient, block: BlockView): Promise<void> {
  await queryClient.cancelQueries({ queryKey: BLOCKS_QUERY_KEY });
  queryClient.setQueryData<BlockList>(BLOCKS_QUERY_KEY, (previous) =>
    previous === undefined
      ? previous
      : { items: [block, ...previous.items.filter((item) => item.student.id !== block.student.id)] },
  );
}

async function cacheBlockRemoved(queryClient: QueryClient, studentId: string): Promise<void> {
  await queryClient.cancelQueries({ queryKey: BLOCKS_QUERY_KEY });
  queryClient.setQueryData<BlockList>(BLOCKS_QUERY_KEY, (previous) =>
    previous === undefined
      ? previous
      : { items: previous.items.filter((item) => item.student.id !== studentId) },
  );
}

// The two writes as both screens use them. A failure reads the list again,
// since the server may hold another one (another tab blocked or lifted
// first), and is rethrown for the screen to show. A Block also deleted the
// pair's Friendship row, pending or accepted (§11.2), so the Friends lists
// drop that Student too. An answer that arrives after another Student signed
// in reaches none of the cache (`writeAsSignedIn`).
export async function addBlock(queryClient: QueryClient, studentId: string): Promise<void> {
  await writeAsSignedIn(
    queryClient,
    () => blockStudent(studentId),
    async (block) => {
      await Promise.all([cacheBlockAdded(queryClient, block), dropFromFriendLists(queryClient, block.student.id)]);
    },
    () => void queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY }),
  );
}

export async function liftBlock(queryClient: QueryClient, studentId: string): Promise<void> {
  await writeAsSignedIn(
    queryClient,
    () => unblockStudent(studentId),
    () => cacheBlockRemoved(queryClient, studentId),
    () => void queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY }),
  );
}
