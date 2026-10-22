import type { ReportReason } from '@shared/reports';
import type { EnGroup } from '../types';

// ADR-0011 d4: the first three labels are the Terms' own words for its
// first three conduct rules, in every language.
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
  postNotice: "Peer Moderators and Admins review reported Posts. Admins can see who filed a Report; Peer Moderators can't, and the Post's author is not told.",
  studentNotice: 'Admins review Reports about a Student and can see who filed them. {name} is not told.',
  submit: 'Send Report',
  submitting: 'Sending…',
  cancel: 'Cancel',
  close: 'Close',
  received: "Your Report was received. You won't be told what happens next.",
  block: 'Block {name}',
} as const satisfies EnGroup;
