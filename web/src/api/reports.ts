import type { ReportReason, ReportTarget } from '@shared/reports';
import { apiFetch } from './client';

export async function fileReport(
  target: ReportTarget,
  reason: ReportReason,
  text: string | undefined,
): Promise<{ received: true }> {
  return apiFetch<{ received: true }>('/reports', {
    method: 'POST',
    body: { ...target, reason, ...(text === undefined ? {} : { text }) },
  });
}
