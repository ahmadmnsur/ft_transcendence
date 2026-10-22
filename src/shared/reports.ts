// §4.2: the Report reasons both ends share, in declaration order.
export const REPORT_REASONS = [
  'HARASSMENT',
  'SPAM',
  'INAPPROPRIATE_CONTENT',
  'OTHER',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
