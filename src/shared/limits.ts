// §6.0.3: the field limits both ends enforce identically. The SPA imports
// this file through the `@shared` alias; the API imports it relatively.
// Plain TypeScript only, so it compiles under both tsconfigs.
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
  // The MIME strings match FileDrop's FileType, so a screen spreads one
  // straight into FileDrop's accept with its maxBytes (§6.0.3, §9.5).
  avatar: { maxBytes: 2097152, mimeTypes: ['image/png', 'image/jpeg'] },
  evidence: {
    maxBytes: 5242880,
    mimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    filenameMaxChars: 255,
  },
} as const;

// §6.0.1: every table pages with `page` ≥ 1 and `pageSize` 1–50, default 20.
export const PAGING = { defaultPageSize: 20, maxPageSize: 50 } as const;

// Characters are Unicode code points, not UTF-16 units (§6.0.3).
export function charLength(value: string): number {
  return [...value].length;
}

// UTF-8 bytes, for the password cap: an accented or Arabic letter counts 2.
export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

// Email is stored trimmed and lower-cased (§6.1).
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const controlPattern = /\p{Cc}/u;
const formatPattern = /\p{Cf}/u;
const JOINER_200C = String.fromCharCode(0x200C);
const JOINER_200D = String.fromCharCode(0x200D);

// Control characters (General Category `Cc`). Multi-line fields allow the
// newline and reject the rest; single-line fields reject all of them (§6.0.3).
export function hasControlChars(value: string, allowNewline: boolean): boolean {
  for (const ch of value) {
    if (allowNewline && ch === '\n') continue;
    if (controlPattern.test(ch)) return true;
  }
  return false;
}

// Unicode format characters (General Category `Cf`), except the joiners
// U+200C and U+200D which legitimate names need.
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

// The general rule every string field shares (§6.0.3): trimmed, counted in
// code points, empty after trimming invalid when the minimum is 1, and
// control characters rejected except a newline in multi-line fields.
export function isValidText(value: string, limits: TextLimits, multiline: boolean): boolean {
  const trimmed = value.trim();
  const length = charLength(trimmed);
  if (length < limits.minChars || length > limits.maxChars) return false;
  return !hasControlChars(trimmed, multiline);
}

// Email: trimmed, ≤ 254, exactly one `@`, non-empty local and domain (§6.0.3).
// A single-line field, so control characters are rejected too. Measured
// after lower-casing, since that is the value stored and lower-casing can
// lengthen it (`İ` becomes two code points).
export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!isValidText(normalized, LIMITS.email, false)) return false;
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;
  return parts[0].length > 0 && parts[1].length > 0;
}

// Password: at least 8 characters and at most 72 UTF-8 bytes after trimming,
// like every string (§6.0.3); no composition rule, no control characters: it
// is a single-line string. The 72 bytes hold only if the trimmed value is the
// one hashed, so both ends trim before they use it.
export function isValidPassword(password: string): boolean {
  const trimmed = password.trim();
  if (hasControlChars(trimmed, false)) return false;
  if (charLength(trimmed) < LIMITS.password.minChars) return false;
  return utf8ByteLength(trimmed) <= LIMITS.password.maxBytes;
}

// Display name: 1–40 characters after trimming, no control characters, no
// format characters except the joiners.
export function isValidDisplayName(name: string): boolean {
  if (!isValidText(name, LIMITS.displayName, false)) return false;
  return !hasForbiddenFormatChars(name.trim());
}

// Search `q` is the one string whose minimum is 0: empty after trimming
// applies no filter and is never a validation failure (§6.0.3).
export function isValidSearchQuery(q: string): boolean {
  return isValidText(q, LIMITS.searchQuery, false);
}

// The Learning Goal sentence: 1–200 characters after trimming, single line,
// so control characters including a newline are rejected (§6.0.3, §6.2).
export function isValidLearningGoalText(text: string): boolean {
  return isValidText(text, LIMITS.learningGoalText, false);
}
