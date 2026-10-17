import type { Language } from './types';

export const languages: readonly Language[] = ['en', 'fr', 'ar'];
export const direction: Record<Language, 'ltr' | 'rtl'> = { en: 'ltr', fr: 'ltr', ar: 'rtl' };
export const storageKey = 'peerconnect.language';

// The locale every Intl call gets, for plurals, numbers, lists, dates and
// times. Arabic names its digits in the tag, so every browser agrees.
export const locale: Record<Language, string> = { en: 'en-GB', fr: 'fr', ar: 'ar-u-nu-arab' };

// Each language's own name, in that language: never translated.
export const languageNames: Record<Language, string> = { en: 'English', fr: 'Français', ar: 'العربية' };

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

// The stored choice, read once before the first render. Blocked storage
// counts as nothing stored.
export function initialLanguage(): Language {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {
    // Blocked storage: nothing to do.
  }
  return firstLanguage(stored, navigator.languages);
}

// The stored choice, written only when the person picks. A failure is
// ignored, so the choice lasts until the page reloads.
export function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(storageKey, language);
  } catch {
    // Blocked storage: nothing to do.
  }
}

// `<html lang>` and `<html dir>`, so the page and its text change together.
export function applyLanguage(language: Language): void {
  document.documentElement.lang = language;
  document.documentElement.dir = direction[language];
}
