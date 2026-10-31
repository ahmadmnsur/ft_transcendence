import type { Prisma } from '../generated/prisma/client';
import { foldName } from '../shared/fold-name';

export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}

export function nameSearchWhere(q: string | undefined): Prisma.StudentWhereInput | undefined {
  const term = q?.trim() ?? '';
  if (term === '') return undefined;
  return { displayNameSearch: { contains: escapeLikePattern(foldName(term)) } };
}
