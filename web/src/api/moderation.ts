import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query';
import { PAGING } from '@shared/limits';
import type { PostGroupAction, ReportReason, ResolvedState, StudentGroupAction } from '@shared/reports';
import { ApiProtocolError, apiFetch } from './client';
import type { StudentRef } from './profile';
import { writeAsSignedIn } from './session';


export type ModeratedPost = {
  id: string;
  author: StudentRef;
  body: string;
  createdAt: string;
  removed: boolean;
} & ({ origin: 'TAKEAWAY' } | { origin: 'PROMPT_ANSWER'; prompt: { id: string; question: string } });

export type GroupTarget = { kind: 'POST'; post: ModeratedPost } | { kind: 'STUDENT'; student: StudentRef };

export function targetKey(target: GroupTarget): string {
  return target.kind === 'POST' ? `post:${target.post.id}` : `student:${target.student.id}`;
}

export type GroupAction = PostGroupAction | StudentGroupAction;

export interface QueueReport {
  reason: ReportReason;
  text: string | null;
  createdAt: string;
  reporter?: StudentRef;
}

export interface QueueGroup {
  target: GroupTarget;
  count: number;
  reports: QueueReport[];
}

export interface ResolvedBatch {
  target: GroupTarget;
  state: ResolvedState;
  resolvedBy: StudentRef;
  resolvedAt: string;
  reports: Array<QueueReport & { reporter: StudentRef }>;
}

export interface ResolvedPage {
  items: ResolvedBatch[];
  total: number;
}

export type Resolution = { state: ResolvedState; count: number };

export const MODERATION_QUERY_KEY = ['moderation'] as const;

export const RESOLVED_PAGE_SIZE = PAGING.defaultPageSize;

export function moderationQueueQueryOptions(admin: boolean) {
  return queryOptions({
    queryKey: [...MODERATION_QUERY_KEY, 'queue', admin ? 'admin' : 'peer'] as const,
    queryFn: async () => {
      const queue = await apiFetch<{ items: QueueGroup[] }>('/moderation/queue');
      if (!admin && queue.items.some((group) => group.reports.some((report) => report.reporter !== undefined))) {
        throw new ApiProtocolError(403, 'forbidden', 'The queue answered as to an Admin.');
      }
      return queue;
    },
  });
}

export function resolvedAuditQueryOptions(page: number) {
  return queryOptions({
    queryKey: [...MODERATION_QUERY_KEY, 'resolved', page] as const,
    queryFn: () => apiFetch<ResolvedPage>(`/admin/reports/resolved?page=${page}&pageSize=${RESOLVED_PAGE_SIZE}`),
    placeholderData: keepPreviousData,
  });
}

function sendResolution(target: GroupTarget, action: GroupAction): Promise<Resolution> {
  return target.kind === 'POST'
    ? apiFetch<Resolution>(`/moderation/post-groups/${encodeURIComponent(target.post.id)}/resolve`, {
        method: 'POST',
        body: { action: action as PostGroupAction },
      })
    : apiFetch<Resolution>(`/moderation/student-groups/${encodeURIComponent(target.student.id)}/resolve`, {
        method: 'POST',
        body: { action: action as StudentGroupAction },
      });
}

export async function resolveGroup(client: QueryClient, target: GroupTarget, action: GroupAction): Promise<Resolution | null> {
  const reread = (): void => void client.invalidateQueries({ queryKey: MODERATION_QUERY_KEY });
  const answer: { resolution: Resolution | null } = { resolution: null };
  await writeAsSignedIn(
    client,
    () => sendResolution(target, action),
    async (resolution) => {
      answer.resolution = resolution;
      reread();
    },
    reread,
  );
  return answer.resolution;
}
