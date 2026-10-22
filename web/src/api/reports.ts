import type { ReportReason } from '@shared/reports';
import { apiFetch } from './client';

// §12.2: a receipt only; the reporter never reads a Report's outcome.
export async function fileReport(
  target: { postId: string } | { studentId: string },
  reason: ReportReason,
  text: string | undefined,
): Promise<{ received: true }> {
  return apiFetch<{ received: true }>('/reports', {
    method: 'POST',
    body: { ...target, reason, ...(text === undefined ? {} : { text }) },
  });
}
