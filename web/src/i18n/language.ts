import type { Language } from './types';

export const languages: readonly Language[] = ['en', 'fr', 'ar'];
export const direction: Record<Language, 'ltr' | 'rtl'> = { en: 'ltr', fr: 'ltr', ar: 'rtl' };
export const storageKey = 'peerconnect.language';

export const locale: Record<Language, string> = { en: 'en-GB', fr: 'fr', ar: 'ar-u-nu-arab' };

export const languageNames: Record<Language, string> = { en: 'English', fr: 'Français', ar: 'العربية' };

function supported(tag: string): Language | undefined {
  const base = tag.split('-')[0]!.toLowerCase();
  return languages.find((l) => l === base);
}

export function firstLanguage(stored: string | null, browser: readonly string[]): Language {
  const chosen = stored === null ? undefined : languages.find((l) => l === stored);
  if (chosen) return chosen;
  for (const tag of browser) {
    const found = supported(tag);
    if (found) return found;
  }
  return 'en';
}

export function initialLanguage(): Language {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {
  }
  return firstLanguage(stored, navigator.languages);
}

export function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(storageKey, language);
  } catch {
  }
}

export function applyLanguage(language: Language): void {
  document.documentElement.lang = language;
  document.documentElement.dir = direction[language];
}
