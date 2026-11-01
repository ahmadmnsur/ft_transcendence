export const LIMITS = {
  email: { minChars: 1, maxChars: 254 },
  password: { minChars: 8, maxBytes: 72 },
  displayName: { minChars: 1, maxChars: 40 },
  skillList: { maxItems: 15 },
  learningGoalText: { minChars: 1, maxChars: 200 },
  directMessage: { minChars: 1, maxChars: 2000 },
  learningOutcome: { minChars: 1, maxChars: 2000 },
  privateFeedback: { minChars: 1, maxChars: 2000, ratingMin: 1, ratingMax: 5 },
  publicTakeaway: { minChars: 1, maxChars: 280 },
  promptQuestion: { minChars: 1, maxChars: 300 },
  promptAnswer: { minChars: 1, maxChars: 1000 },
  reportText: { minChars: 1, maxChars: 1000 },
  searchQuery: { minChars: 0, maxChars: 60 },
  avatar: { maxBytes: 2097152, mimeTypes: ['image/png', 'image/jpeg'] },
  evidence: {
    maxBytes: 5242880,
    mimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    filenameMaxChars: 255,
  },
} as const;

export const PAGING = { defaultPageSize: 20, maxPageSize: 50 } as const;

export function charLength(value: string): number {
  return [...value].length;
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const controlPattern = /\p{Cc}/u;
const formatPattern = /\p{Cf}/u;
const JOINER_200C = String.fromCharCode(0x200C);
const JOINER_200D = String.fromCharCode(0x200D);

// An emoji: a pictograph, a flag letter, a skin tone, the emoji presentation
// selector U+FE0F or the keycap mark U+20E3 (§5.1's note of 2026-11-01).
// It also takes a few symbols Unicode counts as pictographs, such as © ® ™
// ‼ ↔ ▶, and no ASCII character.
const emojiPattern = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{20E3}]/u;

export function hasEmoji(value: string): boolean {
  return emojiPattern.test(value);
}

export function hasControlChars(value: string, allowNewline: boolean): boolean {
  for (const ch of value) {
    if (allowNewline && ch === '\n') continue;
    if (controlPattern.test(ch)) return true;
  }
  return false;
}

export function hasForbiddenFormatChars(value: string): boolean {
  for (const ch of value) {
    if (ch === JOINER_200C || ch === JOINER_200D) continue;
    if (formatPattern.test(ch)) return true;
  }
  return false;
}

export interface TextLimits {
  minChars: number;
  maxChars: number;
}

export function isValidText(value: string, limits: TextLimits, multiline: boolean): boolean {
  const trimmed = value.trim();
  const length = charLength(trimmed);
  if (length < limits.minChars || length > limits.maxChars) return false;
  return !hasControlChars(trimmed, multiline);
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!isValidText(normalized, LIMITS.email, false)) return false;
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;
  return parts[0].length > 0 && parts[1].length > 0;
}

export function isValidPassword(password: string): boolean {
  const trimmed = password.trim();
  if (hasControlChars(trimmed, false)) return false;
  if (charLength(trimmed) < LIMITS.password.minChars) return false;
  return utf8ByteLength(trimmed) <= LIMITS.password.maxBytes;
}

// A new password: sign-up's, the password change's, Confirm with 42's, and
// the staff and seed passwords in `.env`. It also holds no emoji (§5.1's
// note of 2026-11-01). A current password keeps the rule above, since one
// set before that note may hold an emoji, and refusing it would lock its
// Student out.
export function isValidNewPassword(password: string): boolean {
  return isValidPassword(password) && !hasEmoji(password);
}

export function isValidDisplayName(name: string): boolean {
  if (!isValidText(name, LIMITS.displayName, false)) return false;
  const trimmed = name.trim();
  return !hasForbiddenFormatChars(trimmed) && !hasEmoji(trimmed);
}

// Why a display name or a new password is invalid, for the sentence under
// its field: an emoji is named before any other reason, so a value that is
// also too short still says emoji (§6.0.3's note of 2026-11-01). Undefined
// when the value is valid.
export type InvalidReason = 'emoji' | 'invalid';

export function displayNameInvalidReason(name: string): InvalidReason | undefined {
  if (isValidDisplayName(name)) return undefined;
  return hasEmoji(name) ? 'emoji' : 'invalid';
}

export function newPasswordInvalidReason(password: string): InvalidReason | undefined {
  if (isValidNewPassword(password)) return undefined;
  return hasEmoji(password) ? 'emoji' : 'invalid';
}

export function isValidSearchQuery(q: string): boolean {
  return isValidText(q, LIMITS.searchQuery, false);
}

export function isValidLearningGoalText(text: string): boolean {
  return isValidText(text, LIMITS.learningGoalText, false);
}
