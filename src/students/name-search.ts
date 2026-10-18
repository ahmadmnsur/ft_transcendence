import type { Prisma } from '../generated/prisma/client';
import { foldName } from '../shared/fold-name';

// Prisma's `contains` puts its text into a LIKE pattern as it is: on Prisma
// 7.10, `contains: '%'` matched every name, and `contains: '\%'` matched only
// a name holding `%`. So `\`, `%` and `_` are escaped here, the backslash
// first, and each then matches only itself (#95's refinement).
function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}

// §6.2's Advanced search and §6.12's Users table match a name the same way:
// the folded search term inside the folded column, `display_name_search`,
// never the email, so `helene` finds Hélène and `احمد` finds أحمد (§4.3.1).
// A term that is absent or empty after trimming is no filter, never a
// refusal (§6.0.3). The fold runs before the escape, since NFKD can turn a
// compatibility character into `%` (U+FF05 `％`).
export function nameSearchWhere(q: string | undefined): Prisma.StudentWhereInput | undefined {
  const term = q?.trim() ?? '';
  if (term === '') return undefined;
  return { displayNameSearch: { contains: escapeLikePattern(foldName(term)) } };
}
