// §4.2: the Report reasons both ends share, in declaration order.
export const REPORT_REASONS = [
  'HARASSMENT',
  'SPAM',
  'INAPPROPRIATE_CONTENT',
  'OTHER',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

// §12.2: the only two report targets, shared by both ends.
export type ReportTarget = { postId: string } | { studentId: string };

// §12.5: what resolving each kind of group takes.
export const POST_GROUP_ACTIONS = ['REMOVE_POST', 'DISMISS'] as const;

export type PostGroupAction = (typeof POST_GROUP_ACTIONS)[number];

export const STUDENT_GROUP_ACTIONS = ['ACTION', 'DISMISS'] as const;

export type StudentGroupAction = (typeof STUDENT_GROUP_ACTIONS)[number];

// §4.3.18: the two terminal states a resolution writes.
export type ResolvedState = 'ACTIONED' | 'DISMISSED';
