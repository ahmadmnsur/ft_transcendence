// §4.3.1: the display-name fold both ends share. NFKD with combining marks
// dropped, `ة` → `ه`, `ى` → `ي`, no tatweel, lower-cased last: NFKD can turn
// a compatibility character into a capital (U+210D `ℍ` → `H`), which an
// earlier lower-casing would miss.
// Plain TypeScript only, so this file compiles under both tsconfigs.
export function foldName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\u0640/g, '')
    .toLowerCase();
}

// Both name columns from the display name, which is trimmed first. Every
// path that writes a name saves both fields through this helper (§4.3.1).
// Keys are the Prisma field names; they map to `display_name` and
// `display_name_search`.
export function nameFields(displayName: string): { displayName: string; displayNameSearch: string } {
  const trimmed = displayName.trim();
  return { displayName: trimmed, displayNameSearch: foldName(trimmed) };
}
