import type { ReportReason } from '@shared/reports';
import type { EnGroup } from '../types';

const reasons = {
  HARASSMENT: 'Harassment',
  SPAM: 'Spam',
  INAPPROPRIATE_CONTENT: 'Inappropriate content',
  OTHER: 'Other',
} as const satisfies Record<ReportReason, string>;

export default {
  reasons,
  report: 'Report',
  postTitle: 'Report a Post by {name}',
  studentTitle: 'Report {name}',
  reason: 'Reason',
  chooseReason: 'Choose a reason',
  reasonRequired: 'Choose a reason.',
  textLabel: 'Details (optional)',
  textHint: 'Up to {limit} characters. A Report cannot be edited or withdrawn.',
  textTooLong: 'Keep the details within {limit} characters.',
  textInvalid: 'Remove tabs and other invisible characters from the details.',
  postNotice: "Peer Moderators and Admins review reported Posts. Admins can see who filed a Report; Peer Moderators can't, and the Post's author won't be informed.",
  studentNotice: "Admins review Reports about a Student and can see who filed them. {name} won't be informed.",
  submit: 'Send Report',
  submitting: 'Sending…',
  cancel: 'Cancel',
  close: 'Close',
  received: 'Your Report was received.',
} as const satisfies EnGroup;
