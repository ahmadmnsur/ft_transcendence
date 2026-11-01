export type Theme = 'light' | 'dark';

export const themes: readonly Theme[] = ['light', 'dark'];
export const storageKey = 'peerconnect.theme';

const darkQuery = '(prefers-color-scheme: dark)';

export function parseTheme(value: string | null | undefined): Theme | null {
  return themes.find((theme) => theme === value) ?? null;
}

export function storedTheme(): Theme | null {
  try {
    return parseTheme(localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  return window.matchMedia(darkQuery).matches ? 'dark' : 'light';
}

export function initialTheme(): Theme {
  return parseTheme(document.documentElement.dataset.theme) ?? storedTheme() ?? systemTheme();
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    return;
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function onSystemThemeChange(listener: (theme: Theme) => void): () => void {
  const query = window.matchMedia(darkQuery);
  const onChange = (): void => listener(query.matches ? 'dark' : 'light');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function onStoredThemeChange(listener: (theme: Theme) => void): () => void {
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== storageKey) return;
    const theme = parseTheme(event.newValue);
    if (theme !== null) listener(theme);
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
