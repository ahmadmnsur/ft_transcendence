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

export function isValidDisplayName(name: string): boolean {
  if (!isValidText(name, LIMITS.displayName, false)) return false;
  return !hasForbiddenFormatChars(name.trim());
}

export function isValidSearchQuery(q: string): boolean {
  return isValidText(q, LIMITS.searchQuery, false);
}

export function isValidLearningGoalText(text: string): boolean {
  return isValidText(text, LIMITS.learningGoalText, false);
}
