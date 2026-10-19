import type { ErrorCode, RefusalCode } from '@shared/codes';
import type { EnGroup } from '../types';

const codes = {
  validation_failed: 'Check the highlighted fields and try again.',
  unauthenticated: 'You are signed out. Sign in again.',
  forbidden: 'You are not allowed to do this.',
  csrf_rejected: 'The upload was refused. Reload the page and try again.',
  not_found: 'This could not be found.',
  payload_too_large: 'This is too large to send.',
  unsupported_media_type: 'The request was refused. Reload the page and try again.',
  internal_error: 'Something went wrong. Try again.',
  busy_retry_later: 'The server is busy. Try again in a moment.',
  no_account: 'No account uses this email.',
  account_removed: "This account was removed and can't sign in again.",
  account_suspended: 'Your account is suspended. Contact an Admin.',
  too_many_attempts: 'Too many attempts. Try again later.',
  email_unavailable: 'This email is already in use.',
  password_incorrect: 'Wrong password.',
  already_signed_in: 'You are already signed in.',
  oauth_failed: 'Sign in with 42 failed. Try again.',
  forty_two_connected: 'This PeerConnect account already has a 42 account connected.',
  forty_two_not_connected: 'Your account has no 42 account connected.',
  confirmation_required: 'Confirm with 42 again, then set your new password.',
  student_removed: 'This Student was removed.',
  self_action_forbidden: "You can't do this to your own account.",
  last_active_admin: 'There must always be at least one active Admin.',
  already_suspended: 'This Student is already suspended.',
  not_suspended: 'This Student is not suspended.',
  goal_skill_not_listed: 'Your Learning Goal must be a Skill on your learning list.',
  file_too_large: 'This file is too large.',
  file_type_not_allowed: 'This type of file is not allowed.',
  file_invalid: "This file can't be read. Choose another file.",
  friend_request_unavailable: "You can't send a friend request to this Student.",
  friendship_exists: 'You are already Friends, or a request is already waiting.',
  request_not_pending: 'This friend request is no longer waiting for an answer.',
  not_friends: 'You are not Friends.',
  already_blocked: 'You have already blocked this Student.',
  not_blocked: 'This Student is not blocked.',
  dm_unavailable: "You can't send a Direct Message to this Student.",
  round_already_open: 'A Round is already open.',
  no_open_round: 'No Round is open.',
  not_a_candidate: 'This Student is not a candidate in this Round.',
  already_matched: 'This Student already has a Match in this Round.',
  pair_blocked: "These two Students can't be matched: one has blocked the other.",
  same_student: "A Student can't be matched with themselves.",
  match_not_pending: 'This Match is no longer waiting for an answer.',
  match_not_in_progress: 'This Match is not in progress.',
  match_not_reviewable: "This Match can't be reviewed now.",
  already_reviewed: 'This Match already has a Review.',
  prompt_not_live: 'This Reflection Prompt is closed.',
  already_answered: 'You have already answered this Reflection Prompt.',
  admins_cannot_answer: "Admins don't answer Reflection Prompts.",
  post_unavailable: 'This Post is no longer available.',
  already_reported: 'You have already reported this.',
  report_target_invalid: "This can't be reported.",
  already_resolved: 'This Report was already resolved.',
  conflict_of_interest: "You can't resolve a Report that concerns you.",
} as const satisfies Record<ErrorCode | RefusalCode, string>;

// `satisfies` misses a key that comes from a spread, so this names any key
// of codes that is not a code.
type NotACode = Exclude<keyof typeof codes, ErrorCode | RefusalCode>;
export const codesChecked: [NotACode] extends [never] ? true : `${NotACode}: not a code` = true;

// An unknown code, or a response that is not the envelope.
export default { unknown: 'Something went wrong. Try again.', codes } as const satisfies EnGroup;
