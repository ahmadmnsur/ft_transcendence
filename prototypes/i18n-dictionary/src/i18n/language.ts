import type { Language } from './types';

export const languages: readonly Language[] = ['en', 'fr', 'ar'];
export const direction: Record<Language, 'ltr' | 'rtl'> = { en: 'ltr', fr: 'ltr', ar: 'rtl' };
export const storageKey = 'peerconnect.language';

function supported(tag: string): Language | undefined {
  const base = tag.split('-')[0]!.toLowerCase();
  return languages.find((l) => l === base);
}

// A choice the person made wins; otherwise the first of the browser's
// languages that PeerConnect has; otherwise English. Nothing is stored here:
// only the switcher stores, so a first visit keeps following the browser.
export function firstLanguage(stored: string | null, browser: readonly string[]): Language {
  const chosen = stored === null ? undefined : languages.find((l) => l === stored);
  if (chosen) return chosen;
  for (const tag of browser) {
    const found = supported(tag);
    if (found) return found;
  }
  return 'en';
}
