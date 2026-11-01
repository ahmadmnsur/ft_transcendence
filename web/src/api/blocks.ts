import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { dropFromFriendLists } from './friends';
import type { StudentRef } from './profile';
import { writeAsSignedIn } from './session';


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

export async function blockStudent(studentId: string): Promise<BlockView> {
  return apiFetch<BlockView>('/blocks', { method: 'POST', body: { studentId } });
}

export async function unblockStudent(studentId: string): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>(`/blocks/${encodeURIComponent(studentId)}`, {
    method: 'DELETE',
    body: {},
  });
}

export function blocksQueryOptions() {
  return queryOptions({
    queryKey: BLOCKS_QUERY_KEY,
    queryFn: fetchBlocks,
    staleTime: 30_000,
  });
}

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
