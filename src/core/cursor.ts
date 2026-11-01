import { ApiError } from './errors';
import { isUuid } from '../shared/uuid';

export type Cursor = { createdAt: Date; id: string };

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
  if (value === undefined) return null;
  if (typeof value !== 'string' || !TOKEN.test(value)) invalid();
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    invalid();
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) invalid();
  const record = parsed as Record<string, unknown>;
  if (Object.keys(record).length !== 2) invalid();
  if (!('id' in record) || !('createdAt' in record)) invalid();
  if (typeof record.id !== 'string' || !isUuid(record.id)) invalid();
  if (typeof record.createdAt !== 'string') invalid();
  const createdAt = new Date(record.createdAt);
  if (Number.isNaN(createdAt.getTime())) invalid();
  if (createdAt.toISOString() !== record.createdAt) invalid();
  return { createdAt, id: record.id };
}
