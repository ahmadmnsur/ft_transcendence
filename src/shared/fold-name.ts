export function foldName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\u0640/g, '')
    .toLowerCase();
}

export function nameFields(displayName: string): { displayName: string; displayNameSearch: string } {
  const trimmed = displayName.trim();
  return { displayName: trimmed, displayNameSearch: foldName(trimmed) };
}
