import { ApiError } from './errors';
import { isUuid } from '../shared/uuid';

// §6.0.1's keyset cursor, shared by the paged message routes: base64url JSON of
// `{ createdAt, id }`, the `(created_at, id)` pair of the last item the client
// already has. A malformed one — wrong alphabet, wrong JSON, wrong keys — is
// `validation_failed`, like any other bad input (§6.15). Next-cursor encode is
// the service's job after a page is read.
export type Cursor = { createdAt: Date; id: string };

// base64url's own alphabet: `+` and `/` are not valid here.
const TOKEN = /^[A-Za-z0-9_-]+$/;

function invalid(): never {
  throw new ApiError('validation_failed');
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id }), 'utf8').toString(
    'base64url',
  );
}

export function decodeCursor(value: unknown): Cursor | null {
  // `?cursor` is optional: its absence is the first page. Type comes from a
  // query object, so anything but one string is invalid.
  if (value === undefined) return null;
  if (typeof value !== 'string' || !TOKEN.test(value)) invalid();
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    invalid();
  }
  // Exactly { createdAt: string, id: uuid }: an array, null, or any other
  // object is a malformed cursor, not one to guess fields from.
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) invalid();
  const record = parsed as Record<string, unknown>;
  if (Object.keys(record).length !== 2) invalid();
  if (!('id' in record) || !('createdAt' in record)) invalid();
  if (typeof record.id !== 'string' || !isUuid(record.id)) invalid();
  if (typeof record.createdAt !== 'string') invalid();
  const createdAt = new Date(record.createdAt);
  // The Date grammar may refuse the string — "garbage" gives an invalid
  // Date whose getTime is NaN — and the round-trip below would throw out of
  // toISOString (an internal error) instead of the bad input's own answer.
  // Refuse it first, the cursor way.
  if (Number.isNaN(createdAt.getTime())) invalid();
  // Round-trip: our own encodes carry the millisecond-precision ISO string,
  // and anything else does not re-encode to what was sent.
  if (createdAt.toISOString() !== record.createdAt) invalid();
  return { createdAt, id: record.id };
}
