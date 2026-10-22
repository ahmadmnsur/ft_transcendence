import type { ReportReason } from '../shared/reports';

export type ReportTarget = { postId: string } | { studentId: string };
export type ReportInput = { target: ReportTarget; reason: ReportReason; text?: string };
