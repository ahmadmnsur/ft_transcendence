import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query';
import { PAGING } from '@shared/limits';
import type { PostGroupAction, ReportReason, ResolvedState, StudentGroupAction } from '@shared/reports';
import { ApiProtocolError, apiFetch } from './client';
import type { StudentRef } from './profile';
import { writeAsSignedIn } from './session';

// §12.4–§12.6's routes, with the exact wire shapes the API returns.

// A reported Post: its body, author, origin and time. Only the resolved audit
// ever shows one `removed` (§12.6).
export type ModeratedPost = {
  id: string;
  author: StudentRef;
  body: string;
  createdAt: string;
  removed: boolean;
} & ({ origin: 'TAKEAWAY' } | { origin: 'PROMPT_ANSWER'; prompt: { id: string; question: string } });

export type GroupTarget = { kind: 'POST'; post: ModeratedPost } | { kind: 'STUDENT'; student: StudentRef };

// A group's or a batch's target as one string, for keys.
export function targetKey(target: GroupTarget): string {
  return target.kind === 'POST' ? `post:${target.post.id}` : `student:${target.student.id}`;
}

export type GroupAction = PostGroupAction | StudentGroupAction;

// One Report. `reporter` comes only to an Admin: a Peer Moderator never
// reads who filed it (ADR-0011 d9).
export interface QueueReport {
  reason: ReportReason;
  text: string | null;
  createdAt: string;
  reporter?: StudentRef;
}

// §12.4: one open group, its Reports oldest first.
export interface QueueGroup {
  target: GroupTarget;
  count: number;
  reports: QueueReport[];
}

// §12.6: one resolution batch, every Report naming its reporter.
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

// Every key under ['moderation'] is the queue or the audit, so one prefix
// reads both again after a resolution.
export const MODERATION_QUERY_KEY = ['moderation'] as const;

// The batches a page holds: the API's default (§6.0.1).
export const RESOLVED_PAGE_SIZE = PAGING.defaultPageSize;

// The queue's answer depends on the reader's role (§12.4), so each role's
// copy has its own key: an Admin demoted to Peer Moderator never sees their
// cached Admin queue, reporters included, on `/moderation`. The other order is
// a Peer Moderator promoted while `/moderation` is open: a read then answers
// as to an Admin, and the peer copy refuses it rather than keep it, since it
// could show after a demotion back, with reporters, Student groups and the
// groups a Block hides. Only an Admin's answer names reporters (ADR-0011 d9),
// and every group holds a Report, so an answer naming one is an Admin's.
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

// While the next page loads, the previous page's answer stays as placeholder
// data, so the pager keeps its total in between; the audit shows no batch from
// it (`ResolvedAudit`).
export function resolvedAuditQueryOptions(page: number) {
  return queryOptions({
    queryKey: [...MODERATION_QUERY_KEY, 'resolved', page] as const,
    queryFn: () => apiFetch<ResolvedPage>(`/admin/reports/resolved?page=${page}&pageSize=${RESOLVED_PAGE_SIZE}`),
    placeholderData: keepPreviousData,
  });
}

// §12.5: one action on the whole group. Each kind takes only its own two
// actions, which the queue offers it. `already_resolved` and
// `conflict_of_interest` are typed 200 refusals (§6.15).
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

// The queue and the audit are read again either way: a refusal means the
// queue was stale. An answer that arrives after another Student signed in
// reaches none of the cache and comes back null (`writeAsSignedIn`).
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
