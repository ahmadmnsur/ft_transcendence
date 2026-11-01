export const REPORT_REASONS = [
  'HARASSMENT',
  'SPAM',
  'INAPPROPRIATE_CONTENT',
  'OTHER',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportTarget = { postId: string } | { studentId: string };

export const POST_GROUP_ACTIONS = ['REMOVE_POST', 'DISMISS'] as const;

export type PostGroupAction = (typeof POST_GROUP_ACTIONS)[number];

export const STUDENT_GROUP_ACTIONS = ['ACTION', 'DISMISS'] as const;

export type StudentGroupAction = (typeof STUDENT_GROUP_ACTIONS)[number];

export type ResolvedState = 'ACTIONED' | 'DISMISSED';
