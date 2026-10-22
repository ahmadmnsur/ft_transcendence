import type { ReportReason, ReportTarget } from '../shared/reports';

// §12.2's wire shapes, exact field names: the SPA depends on them.
export type ReportInput = { target: ReportTarget; reason: ReportReason; text?: string };

// ADR-0011 d12: the honest confirmation; the reporter is told nothing more.
export type ReportReceipt = { received: true };
